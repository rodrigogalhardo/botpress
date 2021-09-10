import { Client, PredictOutput, ServerInfo, TrainingState, TrainInput } from '@botpress/nlu-client'
import _ from 'lodash'

export type TrainListener = (
  tp: TrainingState | undefined
) => Promise<{ keepListening: true } | { keepListening: false; err?: Error }>

const TRAIN_POLLING_MS = 500

export class NLUClientWrapper {
  constructor(private _client: Client) {}

  public listenForTraining(botId: string, modelId: string, l: TrainListener) {
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const tp = await this.getTraining(botId, modelId)
          if (!tp) {
            return
          }
          const ret = await l(tp)
          if (!ret.keepListening) {
            clearInterval(interval)
            if (!ret.err) {
              return resolve()
            }
            return reject(ret.err)
          }
        } catch (err) {
          reject(err)
        }
      }, TRAIN_POLLING_MS)
    })
  }

  public async getInfo(): Promise<ServerInfo> {
    const response = await this._client.getInfo()
    if (!response.success) {
      return this._throwError(response.error)
    }
    return response.info
  }

  public async pruneModels(appId: string): Promise<string[]> {
    const response = await this._client.pruneModels(appId)
    if (!response.success) {
      return this._throwError(response.error)
    }
    return response.models
  }

  public async startTraining(appId: string, trainInput: TrainInput): Promise<string> {
    const { entities, intents, seed, language } = trainInput

    const contexts = _(intents)
      .flatMap(i => i.contexts)
      .uniq()
      .value()

    const response = await this._client.startTraining(appId, {
      contexts,
      entities,
      intents,
      language,
      seed
    })

    if (!response.success) {
      return this._throwError(response.error)
    }

    return response.modelId
  }

  public async getTraining(appId: string, modelId: string): Promise<TrainingState | undefined> {
    const response = await this._client.getTrainingStatus(appId, modelId)
    if (!response.success) {
      return
    }
    return response.session
  }

  public async cancelTraining(appId: string, modelId: string): Promise<void> {
    const response = await this._client.cancelTraining(appId, modelId)
    if (!response.success) {
      return this._throwError(response.error)
    }
  }

  public async detectLanguage(appId: string, utterance: string, models: string[]): Promise<string> {
    const response = await this._client.detectLanguage(appId, {
      models,
      utterances: [utterance]
    })

    if (!response.success) {
      return this._throwError(response.error)
    }

    return response.detectedLanguages[0]
  }

  public async predict(appId: string, utterance: string, modelId: string): Promise<PredictOutput> {
    const response = await this._client.predict(appId, modelId, { utterances: [utterance] })
    if (!response.success) {
      return this._throwError(response.error)
    }
    const preds = response.predictions[0]
    return preds
  }

  private _throwError(err: string): never {
    throw new Error(`An error occured in NLU server: ${err}`)
  }
}

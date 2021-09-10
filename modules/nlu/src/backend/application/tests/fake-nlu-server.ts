import { PredictOutput, ServerInfo, TrainingState, TrainingStatus, TrainInput } from '@botpress/nlu-client'
import crypto from 'crypto'
import { NLUClientWrapper, TrainListener } from '../nlu-client'
import { sleep } from './test-utils'

const makeId = (appId: string, modelId: string) => `${appId}/${modelId}`

class Training {
  private listeners: TrainListener[] = []
  public canceled = false
  public progress = 0
  public status: TrainingStatus = 'training-pending'

  constructor(public appId: string, public modelId: string, private stepDelai: number) {}

  public get id() {
    return makeId(this.appId, this.modelId)
  }

  public async start() {
    await sleep(this.stepDelai)
    if (this.checkIfCanceled()) {
      return
    }
    this.notify()

    this.status = 'training'
    await sleep(this.stepDelai)
    if (this.checkIfCanceled()) {
      return
    }
    this.notify()

    const N = 5
    for (let i = 0; i < N; i++) {
      await sleep(this.stepDelai)
      if (this.checkIfCanceled()) {
        return
      }
      this.progress += 1 / N
      this.notify()
    }

    await sleep(this.stepDelai)
    if (this.checkIfCanceled()) {
      return
    }
    this.status = 'done'
    this.notify()
  }

  public addListener(l: TrainListener) {
    this.listeners.push(l)
  }

  public cancel() {
    this.canceled = true
  }

  public getState(): TrainingState {
    const { progress, status } = this
    return { progress, status }
  }

  private notify() {
    const { progress, status } = this
    const ts: TrainingState = { progress, status }
    this.listeners.forEach(l => l(ts))
  }

  private checkIfCanceled() {
    if (this.canceled) {
      this.status = 'canceled'
      this.notify()
      return true
    }
    return false
  }
}

export class FakeNLUServer extends NLUClientWrapper {
  private trainings: Training[] = []

  public async listenForTraining(botId: string, modelId: string, l: TrainListener) {}

  public async getInfo(): Promise<ServerInfo> {
    const languages = ['en', 'fr']
    return {
      version: '1.0.0',
      health: {
        isEnabled: true,
        validLanguages: languages,
        validProvidersCount: 1
      },
      languages,
      specs: {
        languageServer: {
          version: '1.0.0',
          dimensions: 300,
          domain: 'bp'
        },
        nluVersion: '1.0.0'
      }
    }
  }

  public async pruneModels(appId: string): Promise<string[]> {
    return []
  }

  public async startTraining(appId: string, trainInput: TrainInput): Promise<string> {
    const modelId = this._makeModelId(trainInput)
    this.trainings.push(new Training(appId, modelId, 10))
    return modelId
  }

  public async getTraining(appId: string, modelId: string): Promise<TrainingState | undefined> {
    const id = makeId(appId, modelId)
    const training = this.trainings.find(t => t.id === id)
    if (!training) {
      return
    }
    return training.getState()
  }

  public async cancelTraining(appId: string, modelId: string): Promise<void> {
    const id = makeId(appId, modelId)
    const training = this.trainings.find(t => t.id === id)
    if (training) {
      training.cancel()
    }
  }

  public async detectLanguage(appId: string, utterance: string, models: string[]): Promise<string> {
    return 'en'
  }

  public async predict(appId: string, utterance: string, modelId: string): Promise<PredictOutput> {
    return {
      contexts: [],
      entities: [],
      spellChecked: utterance
    }
  }

  private _makeModelId = (trainInput: TrainInput) => {
    const content = [...trainInput.entities, ...trainInput.intents]
    return crypto
      .createHash('sha1')
      .update(JSON.stringify(content))
      .digest('hex')
  }
}

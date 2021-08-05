import * as sdk from 'botpress/sdk'
import { Client, CloudClient } from '@botpress/nlu-client'

import _ from 'lodash'
import { LanguageSource } from 'src/config'
import { IStanEngine } from '../stan'
import pickSeed from './pick-seed'
import { Bot, IBot } from './scoped/bot'
import { ScopedDefinitionsService, IDefinitionsService } from './scoped/definitions-service'
import { IDefinitionsRepository } from './scoped/infrastructure/definitions-repository'
import { BotDefinition, BotConfig, I } from './typings'
import { StanEngine } from '../stan'

export interface ScopedServices {
  bot: IBot
  defService: IDefinitionsService
}

export type DefinitionRepositoryFactory = (botDef: BotDefinition) => IDefinitionsRepository

export interface ConfigResolver {
  getBotById(botId: string): Promise<BotConfig | undefined>
}

export type IScopedServicesFactory = I<ScopedServicesFactory>

export class ScopedServicesFactory {
  constructor(
    private _languageSource: LanguageSource,
    private _logger: sdk.Logger,
    private _makeDefRepo: DefinitionRepositoryFactory
  ) {}

  private makeEngine(botConfig: BotConfig): IStanEngine {
    const { cloud } = botConfig

    const stanClient = cloud ? 
      new CloudClient(this._languageSource.endpoint, cloud.oauthUrl, cloud.clientId, cloud.clientSecret) :
      new Client(this._languageSource.endpoint, this._languageSource.authToken)

    return new StanEngine(stanClient, '') // No need for password as Stan is protected by an auth token
  }

  public makeBot = async (botConfig: BotConfig): Promise<ScopedServices> => {
    const { id: botId } = botConfig

    const engine = this.makeEngine(botConfig)

    const { defaultLanguage } = botConfig
    const { languages: engineLanguages } = await engine.getInfo()
    const languages = _.intersection(botConfig.languages, engineLanguages)
    if (botConfig.languages.length !== languages.length) {
      const missingLangMsg = `Bot ${botId} has configured languages that are not supported by language sources. Configure a before incoming hook to call an external NLU provider for those languages.`
      this._logger.forBot(botId).warn(missingLangMsg, { notSupported: _.difference(botConfig.languages, languages) })
    }

    const botDefinition: BotDefinition = {
      botId,
      defaultLanguage,
      languages,
      seed: pickSeed(botConfig)
    }

    const defRepo = this._makeDefRepo(botDefinition)

    const defService = new ScopedDefinitionsService(botDefinition, defRepo)

    const bot = new Bot(botDefinition, engine, defService, this._logger)

    return {
      defService,
      bot
    }
  }
}

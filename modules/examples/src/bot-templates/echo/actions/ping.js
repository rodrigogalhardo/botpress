  /**
   * Type !ping and the bot will response with pong
   * @title ping Example
   * @category Echo
   * @author Botpress
   */
  const myAction = async () => {
    const payloads = await bp.cms.renderElement('builtin_text', { text: 'Pong' }, event)
    bp.events.replyToEvent(event, payloads)
  }

  return myAction()
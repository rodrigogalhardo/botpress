  /**
   * Type !echo and will repeat the message that follow !echo
   * @title Repeat message
   * @category Echo
   * @author botpress
   */
  const myAction = async () => {
    const regex = /!echo/i
    const parsedText = event.payload.text.replace(regex, '')
    const payloads = await bp.cms.renderElement('builtin_text', { text: parsedText }, event)
    await bp.events.replyToEvent(event, payloads)
  }

  return myAction()
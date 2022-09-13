function getUserId() {
  const convId = Object.keys(chat.openConvs || {})[0];
  if (convId) {
    const participants = (chat.openConvs[convId]?.conversationDetails?.dialogs[0] || {}).participantsDetails || [];
    return (participants.find(p => p.role == "CONSUMER" && p.state == "ACTIVE") || {}).id
  }
}
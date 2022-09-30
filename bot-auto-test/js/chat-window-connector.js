var responses = [];
var chat;
// Init JsonPollock renderer
JsonPollock.init({ maxAllowedElements: 100 });

const DEV = {
	KITCHEN: {
		account: 51200453,
		campaignId: 3058123630,
		engagementId: 3058156130, // DEV WEB Kitchen
		skillId: 3438865930, // DEV WEB Kitchen
	},
	HOMEPAGE: {
		account: 51200453,
		campaignId: 3058123630,
		engagementId: 3058153730, // DEV WEB HOMEPAGE
		skillId: 3438865830, // DEV WEB HOMEPAGE
	},
	SMS: {
		account: 51200453,
		campaignId: 3058123630,
		engagementId: 3499935930,
		skillId: 3499922730,
	},
	ES_WEB: {
		account: 51200453,
		campaignId: 3058123630,
		engagementId: 3910228138,
		skillId: 3910239138,
	}
};

function chatEventHandler(e) {
	const role = e.originatorMetadata?.role;
	const eType = e.event?.type || '';
	const cType = e.event?.contentType || e.event?.content?.type;
	if (eType === "RichContentEvent") {
		if (role == 'ASSIGNED_AGENT') {
			commandsModel.onBotResponse(e.event);
			if (cType == "image") {
				onBotImage(e.event?.content?.url);
			} else {
				// console.log(e);
				onBotReachContent(e.event.content);
			}
		}
	} else if (eType == 'ContentEvent') {
		if (role == 'ASSIGNED_AGENT') {
			commandsModel.onBotResponse(e.event);
			if (cType == "text/plain") {
				onBotTextMessage(e.event.message, (e.event.quickReplies?.replies || []).map(q => q.title));
			} else if (cType == "carousel") {
				onBotTextMessage("TODO: Carousel");
			}
		} else if (role == "CONSUMER") {
			if (cType == "text/plain") {
				onUserMessage(e.event.message);
			}
		}
	}
}

function chatStateHandler(state) {
	console.log(state);
	if (state == 'PAUSE') commandsModel.onChatPause();
}

function initChatConnection(options) {
	chat = new window.windowKit(options);
	
	chat.onAgentChatState(chatStateHandler);
	chat.onMessageEvent(chatEventHandler);
	// chat.onAgentTextEvent(text => {});
	// chat.onAgentRichContentEvent(content => {});
	chat.connect();
}

// async function startNewConversation(options) {
// 	if (!chat) return console.log('There is no chat connection');
// 	await closeCurrentConversation();
// 	Object.assign(chat.options, options);
// 	// chat.connect();
// }

// async function closeCurrentConversation() {
// 	if (!chat) return console.log('There is no chat connection');
// 	const conversationId = Object.keys(chat.openConvs)[0];	
// 	if (conversationId) {
// 		const body = {
// 			conversationId,
// 			conversationField: [
// 				{
// 					field: "ConversationStateField",
// 					conversationState: "CLOSE"
// 				}
// 			]
// 		};
// 		console.log(conversationId);
// 		try {
// 			await chat.socket.updateConversationField(body, {});
// 			console.log(`Conversation ${conversationId} closed`);
// 		} catch (e) {
// 			console.error('Fail to close conversation');
// 		}		
// 	}
// 	return console.log('There are no open conversations');
// }

// 

class ProgressAnimation {
	constructor () {
		this.isRunning = false;
	}

	getAnimationElement() {
		if (this.progressAnimation) return this.progressAnimation;
		this.progressAnimation = window.document.getElementById('script-progress-animation');
		return this.progressAnimation;
	}

	start () {
		if (!this.isRunning) {
			this.isRunning = true;
			this.getAnimationElement().classList.remove('hidden');
		}
	}
	
	stop () {
		if (this.isRunning) {
			this.isRunning = false;
			this.getAnimationElement().classList.add('hidden');
		}
	}
}

const progressAnimation = new ProgressAnimation();
commandsModel.registerOnProgressStart(() => progressAnimation.start());
commandsModel.registerOnProgressStop(() => progressAnimation.stop());

const chnl = (new URLSearchParams(window.location.search).get('channel') || '').toLowerCase();
if (chnl === 'sms' || chnl === 'abc') {
	initChatConnection(DEV.SMS);
} else if (chnl === 'es_web') {
	initChatConnection(DEV.ES_WEB);
} else if (chnl === 'web_kitchen') {
	initChatConnection(DEV.KITCHEN);
} else {
	initChatConnection(DEV.HOMEPAGE);
}

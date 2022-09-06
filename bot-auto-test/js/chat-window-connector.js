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
	
};

function chatEventHandler(e) {
	const role = e.originatorMetadata?.role;
	const eType = e.event?.type || '';
	const cType = e.event?.contentType || e.event?.content?.type;
	if (eType === "RichContentEvent") {
		if (role == 'ASSIGNED_AGENT') {
			commandData.responses.push(e.event);
			if (cType == "image") {
				onBotImage(e.event?.content?.url);
			} else {
				console.log(e);
				onBotReachContent(e.event.content);
			}
		}
	} else if (eType == 'ContentEvent') {
		if (role == 'ASSIGNED_AGENT') {
			commandData.responses.push(e.event);
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
	console.log(state)
	if (state == 'PAUSE') checkCommandsState();
}

function initChatConnection(options) {
	chat = new window.windowKit(options);
	
	chat.onAgentChatState(chatStateHandler);
	chat.onMessageEvent(chatEventHandler);
	// chat.onAgentTextEvent(text => {});
	// chat.onAgentRichContentEvent(content => {});

	chat.connect();
}

function checkCommandsState() {
	if (commandData.currentState == 'wait_for_response') { runNextStep(); }
}

function runNextStep() {
	const index = commandData.currentIndex;
	const item = commandData.commands[index];
	commandData.currentState = 'run';
	commandData.currentIndex += 1;
	if (!item) return onCommandsFinished();
	item.cmd.run(item, window.chat, (state) => {
		applyProgressState(state);
		if (state === 'next') {
			runNextStep();
		} else if (state === 'wait') {
			commandData.responses = [];
			commandData.currentState = 'wait_for_response';
		} else if (state == 'failed') {
			commandData.currentState = 'failed';
		}
	});
}

function onCommandsFinished() {
	const state = 'finished'
	applyProgressState(state);
	commandData.currentState = state;
}

function runCommands() {
	if (['finished', 'hold', 'failed'].includes(commandData.currentState)) {
		commandData.responses = [];
		commandData.commands.forEach(c => c.reset());
		commandData.currentIndex = 0;
		runNextStep()
	}
}

function applyProgressState(state) {
	const progressAnimation = window.document.getElementById('script-progress-animation');
	function showProgressAnimation() {
		if (progressAnimation.dataset.hidden) {
			delete progressAnimation.dataset.hidden;
			progressAnimation.classList.remove('hidden');
		}
	}
	function hideProgressAnimation() {
		if (!progressAnimation.dataset.hidden) {
			progressAnimation.dataset.hidden = true;
			progressAnimation.classList.add('hidden');
		}
	}
	if (['finished', 'hold', 'failed'].includes(state)) return hideProgressAnimation();
	showProgressAnimation();
}

async function startNewConversation(options) {
	if (!chat) return console.log('There is no chat connection');
	await closeCurrentConversation();
	Object.assign(chat.options, options);
	// chat.connect();
}

async function closeCurrentConversation() {
	if (!chat) return console.log('There is no chat connection');
	const conversationId = Object.keys(chat.openConvs)[0];	
	if (conversationId) {
		const body = {
			conversationId,
			conversationField: [
				{
					field: "ConversationStateField",
					conversationState: "CLOSE"
				}
			]
		};
		console.log(conversationId);
		try {
			await chat.socket.updateConversationField(body, {});
			console.log(`Conversation ${conversationId} closed`);
		} catch (e) {
			console.error('Fail to close conversation');
		}		
	}
	return console.log('There are no open conversations');
}


initChatConnection(DEV.KITCHEN);
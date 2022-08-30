var responses = [];

var chat = new window.windowKit({
	account: 51200453,
	campaignId: 3058123630,
	engagementId: 3058156130, // DEV WEB Kitchen
	skillId: 3438865930, // DEV WEB Kitchen
});

chat.connect();

JsonPollock.init({
	maxAllowedElements: 100,
	// onAfterElementRendered: onAfterElementRenderedHandler
});

	// chat.callBacks.forEach(c => chat[c]((a) => { console.log(c + ': '); console.log(a); }));
	// chat.onAgentTextEvent((text) => {});
	// chat.onAgentRichContentEvent((content) => {});
	// chat.onAgentChatState((state) => {});

chat.onAgentChatState((state) => {
	if (state == 'PAUSE') checkCommandsState();
});
	// window.chat.onAgentTextEvent(text => { instance.botResponses.push(text); });
	// window.chat.onAgentRichContentEvent(content => { instance.botResponses.push(content); });
window.chat.onMessageEvent(e => {
	const role = e.originatorMetadata?.role;
	const eType = e.event?.type || '';
	const cType = e.event?.contentType || e.event?.content?.type;
	if (eType === "RichContentEvent") {
		if (role == 'ASSIGNED_AGENT') {
			commandData.responses.push(e.event);
			if (cType == "image") {
				onBotImage(e.event?.content?.url);
			} else {
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
});

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

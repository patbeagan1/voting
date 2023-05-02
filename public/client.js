const proposalContainer = document.getElementById('proposal-container');
const newProposalBtn = document.getElementById('new-proposal-btn');
const modal = document.getElementById('modal');
const submitBtn = document.getElementById('submit-btn');
const proposalText = document.getElementById('proposal-text');
const sessionButton = document.getElementById("session-btn");

let sessionActive = false;
let sessionId = undefined;

function createProposalCard(proposal) {
    const card = document.createElement('div');
    card.className = 'proposal-card';
    card.dataset.id = proposal.id;
    card.dataset.votes = proposal.votes
    card.dataset.sessionId = proposal.session_id

    const sessionBadge = document.createElement('span')
    sessionBadge.className = 'session-badge'
    sessionBadge.textContent = `Session ${proposal.session_id}`
    card.append(sessionBadge)

    const text = document.createElement('p');
    text.textContent = proposal.text;
    card.appendChild(text);

    const votes = document.createElement('p');
    votes.textContent = `Votes: ${proposal.votes}`;
    votes.classList.add('votes')
    card.appendChild(votes);

    const voteBtn = document.createElement('button');
    voteBtn.textContent = 'Vote';
    voteBtn.classList.add('vote-btn');
    voteBtn.addEventListener('click', () => {
        if (!sessionActive) {
            alert('A session must be active to submit a vote')
            return
        }

        ws.send(JSON.stringify({ type: 'submit-vote', id: proposal.id }));
    });
    card.appendChild(voteBtn);

    return card;
}

newProposalBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
});

submitBtn.addEventListener('click', async () => {

    if (!sessionActive) {
        alert('A session must be active to submit a proposal')
        return
    }

    const text = proposalText.value.trim();
    if (text) {
        const response = await fetch('/proposal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ text }),
        });
    }
    modal.classList.add('hidden');
});

sessionButton.addEventListener('click', async () => {
    ws.send(JSON.stringify(new SessionChangedEvent()));
})

class SessionChangedEvent {
    constructor() {
        this.type = 'submit-session'
    }
}

const ws = new WebSocket(`ws://${location.host}`);
ws.addEventListener('message', (event) => {

    console.log(event.data)

    const data = JSON.parse(event.data);
    const type = data.type

    if (type === 'init') {
        data.proposals.forEach((p) => {
            proposalContainer.appendChild(createProposalCard(p));
        });
        onSessionChange(data.sessionActive, data.sessionId)
        updateAcceptedProposalHighlighting(data.count)
    } else if (type === 'newProposal') {
        proposalContainer.appendChild(createProposalCard(data.proposal));
    } else if (type === 'vote-change') {
        const card = proposalContainer.querySelector(`[data-id="${data.id}"]`);
        if (card) {
            const voteText = card.querySelector('.votes');
            voteText.textContent = `Votes: ${data.votes}`;
            card.dataset.votes = data.votes
        }
        updateAcceptedProposalHighlighting(data.count);
    } else if (type === 'clientCount') {
        document.getElementById('client-count').textContent = `Connected clients: ${data.count}`;
        updateAcceptedProposalHighlighting(data.count);
    } else if (type === 'session-change') {
        onSessionChange(data.sessionActive, data.sessionId)
    }
});

function onSessionChange(newSessionStatus, newSessionId) {
    const cards = document.getElementsByClassName('proposal-card')
    for (card of cards) {
        if (newSessionId !== card.dataset.sessionId) {
            card.getElementsByClassName('vote-btn')[0].classList.add('cannot-vote')
        }
    }
    sessionId = newSessionId
    sessionActive = newSessionStatus

    const voteButtons = document.getElementsByClassName('vote-btn')
    if (sessionActive) {
        sessionButton.textContent = "End Session"
        newProposalBtn.classList.remove('hidden')
        document.body.classList.add("session-active")
        for (button of voteButtons) {
            button.classList.remove("hidden")
        }
    } else {
        sessionButton.textContent = "Start Session"
        document.body.classList.remove("session-active")
        newProposalBtn.classList.add('hidden')
        for (button of voteButtons) {
            button.classList.add("hidden")
        }
    }
}

function updateAcceptedProposalHighlighting(clientCount) {
    const cards = document.querySelectorAll('.proposal-card');
    cards.forEach((card) => {
        const votes = card.dataset.votes
        if (votes >= clientCount) {
            card.classList.add("accepted")
        } else {
            card.classList.remove("accepted")
        }
    });
}

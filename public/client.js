const proposalContainer = document.getElementById('proposal-container');
const newProposalBtn = document.getElementById('new-proposal-btn');
const modal = document.getElementById('modal');
const submitBtn = document.getElementById('submit-btn');
const proposalText = document.getElementById('proposal-text');

function createProposalCard(proposal) {
    const card = document.createElement('div');
    card.className = 'proposal-card';
    card.dataset.id = proposal.id;

    const text = document.createElement('p');
    text.textContent = proposal.text;
    card.appendChild(text);

    const votes = document.createElement('p');
    votes.textContent = `Votes: ${proposal.votes}`;
    votes.className = 'votes';
    card.dataset.votes = proposal.votes
    card.appendChild(votes);

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    card.appendChild(overlay);

    const voteBtn = document.createElement('button');
    voteBtn.textContent = 'Vote';
    voteBtn.className = 'vote-btn';
    voteBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'vote', id: proposal.id }));
    });
    card.appendChild(voteBtn);


    return card;
}

newProposalBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
});

submitBtn.addEventListener('click', async () => {
    const text = proposalText.value.trim();
    if (text) {
        const response = await fetch('/proposal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const proposal = await response.json();
        proposalContainer.appendChild(createProposalCard(proposal));
        proposalText.value = '';
    }
    modal.classList.add('hidden');
});

const ws = new WebSocket(`ws://${location.host}`);
ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    const type = data.type

    if (type === 'init') {
        data.proposals.forEach((p) => {
            proposalContainer.appendChild(createProposalCard(p));
        });
    } else if (type === 'newProposal') {
        proposalContainer.appendChild(createProposalCard(data.proposal));
    } else if (type === 'updateVotes') {
        const card = proposalContainer.querySelector(`[data-id="${data.id}"]`);
        if (card) {
            const voteText = card.querySelector('.votes');
            voteText.textContent = `Votes: ${data.votes}`;
        }
        checkProposalVotes(data.count);
    } else if (type === 'clientCount') {
        document.getElementById('client-count').textContent = `Connected clients: ${data.count}`;
        checkProposalVotes(data.count);
    }
});

function checkProposalVotes(clientCount) {
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

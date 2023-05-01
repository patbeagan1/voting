const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const proposals = [];

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/proposal', (req, res) => {
    const proposal = { ...req.body, id: proposals.length, votes: 0 };
    proposals.push(proposal);
    res.status(201).json(proposal);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'newProposal', proposal }));
        }
    });
});

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', proposals }));

    ws.on('message', (message) => {
        const { type, id } = JSON.parse(message);
        if (type === 'vote') {
            const proposal = proposals[id];
            if (proposal) {
                proposal.votes += 1;
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'updateVotes', id, votes: proposal.votes }));
                    }
                });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

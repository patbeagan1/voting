const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const runtimeId = Math.random().toFixed(3) * 1000000
let sessionActive = false
let sessionId = runtimeId

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/proposal', async (req, res) => {
    const { text } = req.body;
    try {

        const sessionClients = wss.clients.size
        const result = await pool.query('INSERT INTO proposals (text, votes, session_clients, session_id) VALUES ($1, 0, $2, $3) RETURNING *', [text, sessionClients, sessionId])

        const proposal = result.rows[0];
        res.status(201).json(proposal);

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'newProposal', proposal }));
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to insert proposal' });
    }
});

wss.on('connection', async (ws) => {
    // if (!sessionActive) {
    //     ws.close()
    //     return
    // }

    wss.clients.forEach((client) => client.send(JSON.stringify({ type: 'clientCount', count: wss.clients.size })));

    try {
        const result = await pool.query('SELECT * FROM proposals');
        ws.send(JSON.stringify({
            type: 'init',
            proposals: result.rows,
            sessionActive,
            sessionId,
            count: wss.clients.size
        }));

        ws.on('message', async (message) => {

            const data = JSON.parse(message)

            const { type, id } = data

            if (type === 'submit-vote') {
                try {

                    const proposalResult = await pool.query("SELECT * FROM proposals WHERE id = $1", [id])
                    const proposal = proposalResult.rows[0]

                    if (proposal.session_id !== sessionId) {
                        console.error("Trying to vote on proposal from old session.")
                        return
                    }

                    const result = await pool.query('UPDATE proposals SET votes = votes + 1 WHERE id = $1 RETURNING votes', [id]);
                    const votes = result.rows[0].votes;

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'vote-change', id, votes, count: wss.clients.size }));
                        }
                    });
                } catch (err) {
                    console.error(err);
                }
            } else if (type === 'submit-session') {
                sessionActive = !sessionActive
                if (sessionActive) {
                    sessionId++
                }
                wss.clients.forEach((client) => client.send(JSON.stringify({ type: 'session-change', sessionActive })));
            }
        });
        ws.on('close', () => {
            wss.clients.forEach((client) => client.send(JSON.stringify({ type: 'clientCount', count: wss.clients.size })));
        });
    } catch (err) {
        console.error(err);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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

let sessionActive = false

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/proposal', async (req, res) => {
    const { text } = req.body;
    try {
        const result = await pool.query('INSERT INTO proposals (text, votes) VALUES ($1, 0) RETURNING *', [text]);
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
        ws.send(JSON.stringify({ type: 'init', proposals: result.rows, sessionActive, count: wss.clients.size }));

        ws.on('message', async (message) => {

            console.log(JSON.parse(message))

            const { type, id } = JSON.parse(message);
            if (type === 'submit-vote') {
                try {
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

# Proposal Voting System

This is a small program for keeping track of things that have been proposed, and how many people are in favor of them. 

## How to run 

To set up the application, you will need to set up an `.env` file that looks like this:
```sh
DB_HOST=localhost
DB_PORT=5432
DB_USER=my_cool_user
DB_PASSWORD=my_cool_password
DB_NAME=my_cool_db
```
and you will need to set up a postgres server. This can be done with the `psql` command - look up the instructions for setting up psql for your machine. 

The schema for the table is 
```sql
CREATE TABLE proposals (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  session_clients INTEGER NOT NULL,
  session_id INTEGER NOT NULL
);
```

Once that is in place, you can just `git clone` this repo, and run 
```sh
node install
node server.js
```

---
# Demos

## Active voting session, adding a new proposal

![Screenshot from 2023-05-04 10-05-05](https://user-images.githubusercontent.com/10187351/236249225-fbb55cc7-ee69-4245-82cf-34af10453f41.png)

## Active voting session, with proposals added

![Screenshot from 2023-05-04 10-05-28](https://user-images.githubusercontent.com/10187351/236249246-99f84db2-e447-4f8f-967b-c9b021c34be7.png)

## Active voting session, with a proposal that has been voted on. 

The proposal will turn green when it has as many votes as there are connected voters in the session.

![Screenshot from 2023-05-04 10-05-37](https://user-images.githubusercontent.com/10187351/236249255-c2eb56eb-f25b-420f-b7a3-27449e5095fd.png)

## The UI when the session has ended. 

Votes can only be cast on proposals that were introduced in the current session - if a new session were to start, the vote button would not appear on the proposals from prior sessions.

![Screenshot from 2023-05-04 10-05-47](https://user-images.githubusercontent.com/10187351/236249256-9756c644-8cd3-44eb-8e25-635ad383ebe9.png)

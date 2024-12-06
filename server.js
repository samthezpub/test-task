const http = require("http");
const md5 = require('md5');
const {ServerApiVersion} = require("mongodb");
const dotenv = require('dotenv').config();
var MongoClient = require('mongodb').MongoClient;

var uri = `mongodb+srv://Zpub:${process.env.DB_PASSWORD}@testtask.9lbsk.mongodb.net/?retryWrites=true&w=majority&appName=TestTask`;

const PORT = 3005;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;

async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db('TestTask'); // Подключаемся к базе данных
        console.log("Подключение к MongoDB установлено!");
    } catch (error) {
        console.error("Ошибка подключения к MongoDB:", error);
        process.exit(1);
    }
}

connectToDatabase();

const server = http.createServer(async (req, res) => {
    console.info(`Получен запрос: ${req.url} метод ${req.method}`);
    res.setHeader("Content-Type", "text/plain");

    const url = req.url;

    if (url === "/user" && req.method === "POST") {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const user = JSON.parse(body);

                if (
                    typeof user.userid !== 'number' ||
                    typeof user.name !== 'string' ||
                    typeof user.about !== 'string'
                ) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');

                    res.end(JSON.stringify({message: 'Некорректный запрос'}));

                    return;
                }


                const exists = await db.collection('users').findOne({userid: user.userid});
                if (exists) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');

                    res.end(JSON.stringify({message: 'Пользователь с таким id уже существует'}));

                    return;
                }

                await db.collection('users').insertOne({userid: user.userid, name: user.name, about: user.about});

                res.statusCode = 201;
                res.setHeader('Content-Type', '');
                res.end(`${md5(user.userid)}`);
            } catch (error) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({message: 'Некорректный запрос'}));

            }
        });


        console.info("Создан пользователь")
    } else if (url.startsWith("/user/") && req.method === "GET") {
        let id = url.split('/')[2];
        if (id) {
            id = parseInt(id)

            // Если пользователь с userid из запроса есть то true
            if (await db.collection('users').findOne({userid: id})) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(await db.collection('users').findOne({userid: id})));
            } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({message: 'Пользователь с таким id не существует'}));
                return;
            }

        } else {
            res.statusCode = 400;
            res.end('Некорректный запрос');
        }
    } else if (url.startsWith("/user/") && req.method === "PUT") {
        let id = url.split('/')[2];
        if (id) {
            id = parseInt(id);

            // Если пользователь с userId существует
            const user = await db.collection('users').findOne({userid: id});

            if (!user) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({message: 'Пользователь с таким id не существует'}));
                return;
            }


            let body = "";

            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const updates = JSON.parse(body);

                    Object.keys(updates).forEach(key => {
                        if (user.hasOwnProperty(key)) {
                            user[key] = updates[key];
                        }
                    });

                    const result = await db.collection('users').updateOne(
                        {userid: id},
                        {$set: updates}
                    );

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(user));
                } catch (error) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({message: 'Некорректный запрос'}));
                }
            });

        } else {
            res.statusCode = 400;
            res.end('Некорректный запрос');
        }
    }
});



server.listen(PORT, () => {
    console.info(`Сервер запущен на порту ${PORT}`)
});
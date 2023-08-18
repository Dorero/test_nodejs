const http = require("http");
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const forward = 'forward';
const back = 'back';
const PORT = process.env.PORT || 3000;

const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: {service: 'm1'},
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: 'app.log'})
    ]
});

const server = http.createServer(async (req, res) => {
    if (req.url === "/" && req.method === "POST") {
        bodyParser.json()(req, res, async () => {
            bodyParser.urlencoded({extended: true})(req, res, async () => {
                try {
                    const result = await sendToQueue(JSON.stringify(req.body));

                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(result));
                } catch (error) {
                    logger.error('This is an error message.', {additionalInfo: error});
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({error: 'Internal server error'}));
                }
            });
        });
    } else {
        res.writeHead(404, {"Content-Type": "application/json"});
        res.end(JSON.stringify({message: "Route not found"}));
    }
});

async function sendToQueue(data) {
    const connection = await amqp.connect('amqp://user:password@rabbitmq:5672');
    const channel_forward = await connection.createChannel();
    const channel_back = await connection.createChannel();

    await channel_forward.assertQueue(forward, {durable: false});
    await channel_back.assertQueue(back, {durable: false});

    channel_forward.sendToQueue(forward, Buffer.from(data));

    logger.info(`Request sent to queue: ${JSON.stringify(data)}`);

    const response = await waitForResponse(channel_back);
    logger.info(`Accepted from m2: ${JSON.stringify(response)}`);
    channel_forward.close();
    channel_back.close();
    connection.close();

    return response;
}

async function waitForResponse(channel) {
    return new Promise((resolve) => {
        channel.consume(back, async (message) => {
            const data = JSON.parse(message.content.toString());
            channel.ack(message);
            logger.info(`Accepted from m2: ${JSON.stringify(data)}`);
            resolve(data);
        }, { noAck: true });
    });
}

server.listen(PORT, () => {
    logger.info(`Server started on port: ${PORT}`)
});
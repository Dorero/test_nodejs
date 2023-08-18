const amqp = require('amqplib');

const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: {service: 'm2'},
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: 'app.log'})
    ]
});


const forward = 'forward';
const back = 'back';

async function startWorker() {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const connection = await amqp.connect('amqp://user:password@rabbitmq:5672');
    const channel_forward = await connection.createChannel();
    const channel_back = await connection.createChannel();

    await channel_forward.assertQueue(forward, {durable: false});
    await channel_back.assertQueue(back, {durable: false});

    await channel_forward.consume(forward, async (message) => {
        await sendResponseToQueue(processData(JSON.parse(message.content.toString())), channel_back);

        channel_forward.ack(message);
    });
}

async function sendResponseToQueue(data, channel) {
    channel.sendToQueue(back, Buffer.from(JSON.stringify(data)));
    logger.info(`Response sent to queue: ${JSON.stringify(data)}`);
}

function processData(requestData) {
    const values = Object.values(requestData);

    if (values.every(value => typeof value === 'number' && !isNaN(value))) {
        const message = 'Wrong data type';
        logger.info(message);
        return message;
    }

    let sum = 0;

    for (const value of values) {
        sum += parseInt(value);
    }

    return sum;
}

startWorker().catch(console.error);


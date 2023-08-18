# What is it
Test task for the position of node.js developer. 
Here are two microservices connected via RabbitMQ. 
The first microservice (m1) has one endpoint that accepts an unlimited number of numbers and passes it to m2 through a queue. 
m2 adds up all the numbers and sends the result to m1 through the queue. 
m1 returns the result to the client. 
Docker and docker-compose must be installed on your machine
## Run
```
 docker-compose up -d
``` 
## Test
```
 curl -X POST -d "one=1&two=555" http://localhost:3000 
``` 
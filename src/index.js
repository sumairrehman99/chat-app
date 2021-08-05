const express = require('express')
const path = require('path')
const http = require('http')
const socketIO = require('socket.io')
const { generateMessage, generateLocation } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')


const app = express()
const server = http.createServer(app)   // Must create HTTP server for socket.io
const port = process.env.PORT || 3000
const io = socketIO(server)         // Configuring socket.io to work with a server

const publicDirectoryPath = path.join(__dirname, '../public')


app.use(express.static(publicDirectoryPath))

// Setting up the socket connection
io.on('connection', (socket) => {
    console.log('New WebSocket Connection')

    

    // Joining a room
    socket.on('join', ({username, room}, callback) => {

        const {error, user} = addUser({ id: socket.id, username, room})

        if (error){
            return callback(error)
        }


        socket.join(user.room)

        // Send the client a request
        socket.emit('message', generateMessage('Welcome'))

        // Sending a message when a new user connects. Limiting it to the room the user is in.
        socket.broadcast.to(user.room).emit('message', generateMessage(username, `${user.username} has joined the room.`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    // Receiving the client's message and sending it to all the clients connected to the server.
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)         // User who sent the message

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    // Sending a message when a user disconnects.
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage(user.username, `${user.username} has left the room.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }


    })

    // Receiving a client's location
    socket.on('shareLocation', (location, callback) => {
        const user = getUser(socket.id) 
        io.emit('locationMessage', generateLocation(user.username, `https://google.com/maps?q=${location.longitude},${location.latitude}`))
        callback()
    })
})



server.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
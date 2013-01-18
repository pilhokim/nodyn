
// nodej bits
var util          = require('util')
var EventEmitter  = require('events').EventEmitter
var Dispatcher    = process.binding('Dispatcher')

// netty bits
var ChannelFactory  = org.jboss.netty.channel.socket.nio.NioServerSocketChannelFactory
var ChannelHandler  = org.jboss.netty.channel.SimpleChannelHandler
var PipelineFactory = org.jboss.netty.channel.ChannelPipelineFactory
var ServerBootstrap = org.jboss.netty.bootstrap.ServerBootstrap
var Channels        = org.jboss.netty.channel.Channels

// java bits
var SocketAddress   = java.net.InetSocketAddress
var Executors       = java.util.concurrent.Executors

module.exports.Socket = function() {
}

var Server = function(listener) {
  this.connectionListener = listener
  this.address = {}

  this.log = function(msg) {
    java.lang.System.err.println(msg)
  }

  this.createAndBind = function(address) {
    this.log('Creating server')
    factory = new ChannelFactory(Executors.newCachedThreadPool(), Executors.newCachedThreadPool())
    bootstrap = new ServerBootstrap(factory)
    bootstrap.setPipelineFactory(Pipeline(this.connectionListener))
    bootstrap.setOption("child.keepAlive", true)
    bootstrap.setOption("child.tcpNoDelay", true)
    bootstrap.bind(address)
  }

  this.listen = function(port, callback) {
    if (callback) { 
      this.addListener('listening', callback); 
    }

    Dispatcher.submit(function(server, port) {
      address = new SocketAddress(port)
      server.address.port = address.port
      server.address.family = (address.address.address.length) == 4 ? 'IPv4' : 'IPv6'
      server.address.address = address.address.canonicalHostName
      server.createAndBind(address)
      server.log("Listening on: " + address)
      server.emit('listening')
    }, this, port)
  }

  this.close = function(callback) {
    if (callback) {
      callback()
    }
    this.emit('close')
  }
}

var Pipeline = function(callback) {
  return new PipelineFactory( { 
    getPipeline: function() {
      handler = ServerHandler(callback)
      return Channels.pipeline(handler)
    }
  } )
}

var ServerHandler = function(callback) {

  return new ChannelHandler( {
    messageReceived: function(context, evnt) {
      channel = evnt.getChannel()
      channel.write( evnt.getMessage() )
      callback.apply( callback, evnt.getMessage() )
    },

    exceptionCaught: function(context, evnt) {
      evnt.cause.printStackTrace()
      evnt.channel.close()
    }
  } )
}

util.inherits(Server, EventEmitter)

module.exports.Server = Server
module.exports.createServer = function(listener) {
  return new Server(listener)
}

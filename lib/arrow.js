/** ---IMPORTS  */



/** ---OUT --- */
var Arrow = module.exports = {}
Arrow.create = function(options){
	options = options || {}
	var context = {}
	var final = null
	var stack = []
	,	api = {}

	api.customStack = setCustomStack
	api.finally = setFinalHandler
	api.context = setContext
	api.getStack = inspectStack
	api.flush = flushStack
	Object.freeze(api)

	stackManager.use = use
	stackManager.finally = setFinalHandler
	stackManager.context = setContext
	stackManager.api = api

	/* applying options */
	if ( options.customStack ) { setCustomStack(options.customStack) }
	if ( options.final ) { setFinalHandler(options.final) }
	if ( options.context && options.context === typeof 'object' ){
		context = options.context
	}


	return stackManager
	function stackManager(){
		var	layerIndex = 0
		,	handlerIndex = 0
		,	args = [].slice.call(arguments)
		,	messages = []
		// calback ( if specified)
		,	_final = final
		|| (
			('function' === typeof args[args.length -1])
			?args.pop()	// shortens arguments by 1
			: 	null
		)


		args.push(next)
		return next()
		function next( err, msg ){
			var layer = stack[layerIndex]
			/**
			* next() will llot for handler at handlerIndex
			* on the current layer which will be applied the arguments
			* and call next(err).
			* next() will then look for a handler at handlerIndex++
			* If next() does not find any defined handler
			* it will step over to the next layer
			* if there is no further layer next() is done
			* --------------------------------------------------------
			* If an error occurs next() tests if err is an object
			* which can (and will) be thrown
			* --------------------------------------------------------
			* If err is a string it's a warning
			* thus it will be passed to the warning collection
			* further the current layer will be aborded
			* and it will be stepped over to the next layer.
			*/
			if (!layer || ( err && err instanceof Error)){
				args.pop()
				if (msg) messages.push(msg)


				args.unshift(err, msg)

				// handles  callback before exiting
				if (_final){
					return _final.apply(context /*proto*/, args/*args*/)
				}
				return {err : err,
						msg : messages }
			}
			if (err && err === 'skip'){ /* error is message */
				if (msg) messages.push(msg)
				layerIndex++
				handlerIndex = 0

				return next()
			}
			if (msg) messages.push(msg)

			var handler = layer[handlerIndex]
			if (!handler){
				layerIndex++
				handlerIndex = 0		// prepare for next layer

				return next()
			}

			handlerIndex++
			return handler.apply(context, args)
		}
}
	function use(check){
		if (!check)	return stackManager // no argument parsed

		var args = [].slice.call(arguments)
		,	arg = 0
		,	layer = []
		,	err = null

		// validates every parsed layer
		for ( ; arg < args.length ; arg++){


			if (Array.isArray( args[arg] )){
				//		--> current argument is a layer
				// 		v Is null if no error in current layer
				err = 	validateLayer( layer )
				|| 		validateLayer( args[arg] )

				// 		^ Is null if no error in nested layer

				if (err) break

				// adds current layer (if defined)
				if ( layer.length > 0) { stack.push(layer); layer = [] }
				if ( args[arg].length > 0) { stack.push(args[arg]) }
				// and nested layer to stack

			}else {
				layer.push(args[arg])
			}
		}

		err = (err)					// holds error if occured
		? err						//if no error yet, validate open layer
		: validateLayer(layer)		//if no error in open layer error is null

		if (err) throw new Error(err)
		if (layer.length > 0)  { stack.push(layer); layer = [] } // adds open layer to stack

		return stackManager
		function validateLayer(_layer_){
			var index = 0

			for ( ; index < _layer_.length ; index++ ){
				if( typeof _layer_[index] !== 'function' ){
					return ('Type of Argument ( '
							+ _layer_[index]
							+ ' ) is [ '
							+ (typeof _layer_[index])
							+ ' ] -- Must be [ function ]!')
				}
			}
			return null // if there is no error
		}
}
	function setCustomStack(stack){
		return use.apply(stackManager, [].slice.call(arguments))
}
	function setFinalHandler(fn){
		if ('function' === typeof fn) { final = fn }
		return stackManager
}
	function setContext(ctx){
		if('object' === typeof ctx){ context = ctx }
		return stackManager
}
	function flushStack(){
		stack = []
		console.warn('Stack wiped!!!')
		return stackManager
}
	function inspectStack(){
		return stack
	}
}

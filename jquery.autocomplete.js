/**
 * @preserve jQuery Autocomplete plugin v1.0.2
 * @homepage http://xdsoft.net/jqplugins/autocomplete/
 * (c) 2014, Chupurnov Valeriy <chupurnov@gmail.com>
 */
!('getComputedStyle' in this) && (this.getComputedStyle = (function () {
	function getPixelSize(element, style, property, fontSize) {
		var
		sizeWithSuffix = style[property],
		size = parseFloat(sizeWithSuffix),
		suffix = sizeWithSuffix.split(/\d/)[0],
		rootSize;

		fontSize = fontSize != null ? fontSize : /%|em/.test(suffix) && element.parentElement ? getPixelSize(element.parentElement, element.parentElement.currentStyle, 'fontSize', null) : 16;
		rootSize = property == 'fontSize' ? fontSize : /width/i.test(property) ? element.clientWidth : element.clientHeight;

		return (suffix == 'em') ? size * fontSize : (suffix == 'in') ? size * 96 : (suffix == 'pt') ? size * 96 / 72 : (suffix == '%') ? size / 100 * rootSize : size;
	}

	function setShortStyleProperty(style, property) {
		var
		borderSuffix = property == 'border' ? 'Width' : '',
		t = property + 'Top' + borderSuffix,
		r = property + 'Right' + borderSuffix,
		b = property + 'Bottom' + borderSuffix,
		l = property + 'Left' + borderSuffix;

		style[property] = (style[t] == style[r] == style[b] == style[l] ? [style[t]]
		: style[t] == style[b] && style[l] == style[r] ? [style[t], style[r]]
		: style[l] == style[r] ? [style[t], style[r], style[b]]
		: [style[t], style[r], style[b], style[l]]).join(' ');
	}

	function CSSStyleDeclaration(element) {
		var
		currentStyle = element.currentStyle,
		style = this,
		fontSize = getPixelSize(element, currentStyle, 'fontSize', null);

		for (property in currentStyle) {
			if (/width|height|margin.|padding.|border.+W/.test(property) && style[property] !== 'auto') {
				style[property] = getPixelSize(element, currentStyle, property, fontSize) + 'px';
			} else if (property === 'styleFloat') {
				style['float'] = currentStyle[property];
			} else {
				style[property] = currentStyle[property];
			}
		}

		setShortStyleProperty(style, 'margin');
		setShortStyleProperty(style, 'padding');
		setShortStyleProperty(style, 'border');

		style.fontSize = fontSize + 'px';

		return style;
	}

	CSSStyleDeclaration.prototype = {
		constructor: CSSStyleDeclaration,
		getPropertyPriority: function () {},
		getPropertyValue: function ( prop ) {
			return this[prop] || '';
		},
		item: function () {},
		removeProperty: function () {},
		setProperty: function () {},
		getPropertyCSSValue: function () {}
	};

	function getComputedStyle(element) {
		return new CSSStyleDeclaration(element);
	}

	return getComputedStyle;
})(this));


!function($){

var 
	ARROWLEFT = 37,
	ARROWRIGHT = 39,
	ARROWUP = 38,
	ARROWDOWN = 40,
	TAB = 9,
	CTRLKEY = 17,
	SHIFTKEY = 16 ,
	DEL = 46,
	ENTER = 13,
	ESC = 27,
	BACKSPACE = 8,
	AKEY = 65,
	CKEY = 67,
	VKEY = 86,
	ZKEY = 90,
	YKEY = 89,
	
	//specialKeys = [ARROWLEFT,ARROWLEFT,ARROWRIGHT,ARROWDOWN,TAB,CTRLKEY,SHIFTKEY,DEL,ENTER,ESC,BACKSPACE],
	
	defaultSetting = {
		valueKey:'value',
		titleKey:'title',
		highlight: true,
		copyright:false,
		showHint:true,
		
		dropdownWidth:'100%',
		dropdownStyle:{},
		itemStyle:{},
		hintStyle:false,
		style:false,
		
		debug : true,
		openOnFocus:true,
		closeOnBlur:true,
		
		autoselect:false,
		
		limit:20,
		timeoutUpdate:10,
		timeoutKeypress:10,
		
		get: function(property,source){
			return __get.call(this,property,source);
		},
		
		replace: [
			function( url,query ){
				return url.replace('%QUERY%',encodeURIComponent(query));
			}
		],
		
		equal:function( value,query ){
			return query.toLowerCase()==value.substr(0,query.length).toLowerCase();
		},
		
		findRight:[
			function(items,query,source){
				var results = [],value = '';
				
				for(var i in items){
					value = __safe.call(this,'getValue',source,[items[i],source]);
					// right side equal
					if( __safe.call(this,'equal',source,[value,query,source],false) ){
						return items[i];
					}
				}
				
				return false;
			}
		],
		
		valid:[
			function ( value,query ){
				return value.toLowerCase().indexOf(query.toLowerCase())!=-1;
			}
		],
		
		filter:[
			function ( items,query,source ){
				var results = [],value = '';
				for(var i in items){
					value = isset(items[i][this.get('valueKey',source)])?items[i][this.get('valueKey',source)]:items[i].toString();
					if( __safe.call(this,'valid',source,[value,query])  )
						results.push(items[i]); 
				}
				return results;
			}
		],
		
		preparse:function(items){
			return items;
		},
		
		getValue:[
			function ( item,source ){
				return isset(item[this.get('valueKey',source)])?item[this.get('valueKey',source)]:item.toString();
			}
		],
		
		getTitle:[
			function ( item,source ){
				return isset(item[this.get('titleKey',source)])?item[this.get('titleKey',source)]:item.toString();
			}
		],
		
		render:[
			function( item,source,pid,query ){
				var value = isset(item[this.get('valueKey',source)])?item[this.get('valueKey',source)]:item.toString(),
					title = (isset(item[this.get('titleKey',source)])?item[this.get('titleKey',source)]:value)+'';
					
				if( this.highlight )
					title = title.replace(RegExp('('+query.replace(/([\[\]\\(\)])/g,'\\$1')+')','i'),'<b>$1</b>');
					
				return '<div '+(value==query?'class="active"':'')+' data-value="'+encodeURIComponent(value)+'">'
							+title+
						'</div>';
			}
		],
		
		source:[]
	},
	
	currentInput = false,
	ctrlDown = false,
	shiftDown = false;
/*
$(window).on('mousedown',function(){
	$(window)
		.trigger('close.xdsoft');
});*/

$(document)
	.on('keydown.xdsoftctrl',function(e) {
		if ( e.keyCode == CTRLKEY )
			ctrlDown = true;
		if ( e.keyCode == SHIFTKEY )
			ctrlDown = true;
	})
	.on('keyup.xdsoftctrl',function(e) {
		if ( e.keyCode == CTRLKEY )
			ctrlDown = false;
		if ( e.keyCode == SHIFTKEY )
			shiftDown = false;
	});

function getCaretPosition( input ) {
	if (!input) return;
	if ( 'selectionStart' in input ) {
		return input.selectionStart;
	} else if ( document.selection ) {
		input.focus();
		var sel = document.selection.createRange();
		var selLen = document.selection.createRange().text.length;
		sel.moveStart('character', -input.value.length);
		return sel.text.length - selLen;
	}
};

function setCaretPosition( input, pos ){
    if( input.setSelectionRange ){
        input.focus();
        input.setSelectionRange(pos,pos);
    }else if ( input.createTextRange ) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', pos);
        range.moveStart('character', pos);
        range.select();
    }
};

function isset( value ){
	return typeof(value)!=='undefined';
};

function safe_call( callback,args,callback2,defaultValue ){
	if( isset(callback) && !$.isArray(callback) ){
		return $.isFunction(callback)?callback.apply(this,args):defaultValue;
	}else
		if( isset(callback2) )
			return safe_call.call(this,callback2,args);
	return defaultValue;
};

function __safe( callbackName,source,args,defaultValue ){
	var undefinedVar;
	return safe_call.call( this, (isset(this.sources[source])&&this.sources[source].hasOwnProperty(callbackName))?this.sources[source][callbackName]:undefinedVar,args, function(){
		return safe_call.call(this,
				isset(this[callbackName][source])?
					this[callbackName][source]:(
						isset(this[callbackName][0])?
							this[callbackName][0]:(
								this.hasOwnProperty(callbackName)?
									this[callbackName]:
									undefinedVar
							)
					),
				args,
				defaultSetting[callbackName][source]||defaultSetting[callbackName][0]||defaultSetting[callbackName],
				defaultValue
		);
	},defaultValue);
};

function __get( property,source ){
	if(!isset(source))
		source = 0;
	
	if( $.isArray(this.sources) && isset(this.sources[source]) && isset(this.sources[source][property]))
		return this.sources[source][property];
		
	if( isset(this[property]) ){
		if( $.isArray(this[property]) ){
			if( isset(this[property][source]) )
				return this[property][source];
			if( isset(this[property][0]) )
				return this[property][0];
			return null;
		}
		return this[property];
	}
	
	return null;
};

function loadRemote( url,sourceObject,done,debug ){
	$.ajax($.extend(true,{
		url : url,
		type  : 'GET' ,
		async:true,
		cache :false,
		dataType : 'json'
	 },sourceObject.ajax))
	 
	 .done(function( data ){
		done&&done.apply(this,$.makeArray(arguments));
	 })
	 
	 .fail(function( jqXHR, textStatus ){
		if( debug )
			console.log("Request failed: " + textStatus);
	 });
}


function findRight( data,query ){
	var right = false;
	
	for(var source in data){
		if( right = __safe.call(this,"findRight",source,[data[source],query,source]) ){
			return {right:right,source:source};
		}
	}
	
	return false;
}
function processData( data,query ){
	var _data = preparseData.call( this,data,query );
	
	for(var source in _data){
		_data[source] = __safe.call(this,'filter',source,[_data[source],query,source],_data[source]);
	}
	
	return _data;
}

function collectData( query,callback ){
	var data = [],
		options = this;
	
	if( $.isFunction(options.sources) ){
			options.sources.apply(options,[query,function(items){
				safe_call.call(options,callback,[data = [items],query]);
			},data,0]);
	}else{
		for( var source in options.sources ){
			if( $.isArray(options.sources[source]) ){
				data[source] = options.sources[source];
			}else if( $.isFunction(options.sources[source]) ){
				options.sources[source].apply(options,[query,function(items){
					if( !data[source] )
						data[source] = [];
						
					if( items && $.isArray(items) )
						data[source] = data[source].concat(items);
						
					safe_call.call(options,callback,[data,query]);
				},data,source]);
			}else{
				switch( options.sources[source].type ){
					case 'remote':
						if( isset(options.sources[source].url) ){
							if( !isset(options.sources[source].minLength) || query.length>=options.sources[source].minLength ){
								var url = __safe.call(options,'replace',source,[options.sources[source].url,query],'');
								loadRemote(url,options.sources[source],function( resp ){
									data[source] = resp;
									safe_call.call(options,callback,[data,query]);
								},options.debug);
							}
						}
					break;
					case 'preload':
						if( !options.sources[source].data ){
							if( isset(options.sources[source].url) ){
								loadRemote(options.sources[source].url,options.sources[source],function( resp ){
									data[source] = resp;
									safe_call.call(options,callback,[data,query]);
								},options.debug);
							}
						}else{
							data[source] = resp;
						}
					break;
					default:
						if( isset(options.sources[source]['data']) ){
							data[source] = options.sources[source]['data'];
						}else{
							data[source] = options.sources[source];
						}
				}
			}
		}
	}
	safe_call.call(options,callback,[data,query]);
};

function preparseData( data,query ){
	var _data = [], source, i;
	
	for(source in data){
		_data[source] = __safe.call(this,
			'preparse',
			source,
			[data[source],query],
			data[source]
		);
	}
	
	return _data;
};

function renderData( data,query ){
	var  source, i, $div, $divs = [];
	
	for( source in data ){
		for( i in data[source] ){
			if( $divs.length>=this.limit )
				break;
				
			$div = $(__safe.call(this,
				'render',source,
				[data[source][i],source,i,query],
				''
			));
			
			$div.data('source',source);
			$div.data('pid',i);
			$div.data('item',data[source][i]);
			
			$divs.push($div);
		}
	}
	
	return $divs;
};

function getItem( $div,dataset ){
	if( isset($div.data('source')) && 
		isset($div.data('pid')) && 
		isset(dataset[$div.data('source')]) && 
		isset(dataset[$div.data('source')][$div.data('pid')]) 
	){
		return dataset[$div.data('source')][$div.data('pid')]
	}
	return false;
};

function getValue( $div,dataset ){
	var item = getItem($div,dataset);
	
	if( item ){
		return __safe.call(this,
			'getValue',$div.data('source'),
			[item,$div.data('source')]
		);
	}else{
		if( isset($div.data('value')) ){
			return decodeURIComponent($div.data('value'));
		}else{
			return $div.html();
		}
	}
};


function init( that,options ){
	if( $(that).hasClass('xdsoft_input') )
			return;
	
	var $box = $('<div class="xdsoft_autocomplete"></div>'),
		$dropdown = $('<div class="xdsoft_autocomplete_dropdown"></div>'),
		$hint = $('<span class="xdsoft_autocomplete_hint"></span>'),
		$input = $(that),
		timer1 = 0,
		dataset = [],
		iOpen	= false,
		value = '',
		currentValue = '',
		currentSelect = '',
		active = null,
		pos = 0;
	
	
	$box
		.css({
			'display':$(that).css('display'),
			'width':$(that).css('width')
		});
	
	if( options.style )
		$box.css(options.style);
		
	$input
		.addClass('xdsoft_input')
		.attr('autocomplete','off');
	
	$dropdown
		.on('mousemove','div',function(){
			if( $(this).hasClass('active') )
				return true;
			$dropdown.find('div').removeClass('active');
			$(this).addClass('active');
		})
		.on('mousedown','div',function(){
			$dropdown.find('div').removeClass('active');
			$(this).addClass('active');
			$input.trigger('pick.xdsoft');
		})
	
	
	function manageData(){
		if( $input.val()!=currentValue ){
			currentValue = $input.val();
		}else
			return;
			
		collectData.call(options, currentValue,function( data,query ){
			if( query != currentValue )
				return;
			dataset = processData.call(options,data,query);
			
			$input.trigger('updateContent.xdsoft');
			
			if( options.showHint && currentValue.length && currentValue.length<=$input.prop('size') && (right = findRight.call(options,dataset,currentValue))  ){
				var title 	=  __safe.call(options,'getTitle',right.source,[right.right,right.source]);
				title = '<span>'+query+'</span>'+title.substr(query.length);
				$hint.html( title );
			}else{
				$hint.html('');
			}
		});

		return;
	}
	function manageKey( event ){
		var key = event.which;
		
		switch( key ){
			case AKEY: case CKEY: case VKEY: case ZKEY: case YKEY:
				if( event.shiftKey || event.ctrlKey )
					return true;
			break;
			case SHIFTKEY:	
			case CTRLKEY:
				return true;
			break;
			case ARROWRIGHT:	
			case ARROWLEFT:
				if( ctrlDown || shiftDown || event.shiftKey || event.ctrlKey )
					return true;
				value = $input.val();
				pos = getCaretPosition($input[0]);
				if( key == ARROWRIGHT && pos==value.length ){
					if( right = findRight.call(options,dataset,value) ){
						$input.trigger('pick.xdsoft',[
							__safe.call(options,
								'getValue',right.source,
								[right.right,right.source]
							)
						]);
					}else
						$input.trigger('pick.xdsoft');
					event.preventDefault();
					return false;
				}
				return true;
			break;
			case TAB:
			return true;
			case ENTER:
				if( iOpen ){
					$input.trigger('pick.xdsoft');
					event.preventDefault();
					return false;
				}else
					return true;
			break;
			case ESC:
				$input
					.val(currentValue)
					.trigger('close.xdsoft');
				event.preventDefault();
				return false;
			break;
			case ARROWDOWN:
			case ARROWUP:
				if( !iOpen ){
					$input.trigger('updateContent.xdsoft');
					$input.trigger('open.xdsoft');
					event.preventDefault();
					return false;
				}
				
				active = $dropdown.find('div.active');
				
				var next = key==ARROWDOWN?'next':'prev', timepick = true;
				
				if( active.length ){
					active.removeClass('active');
					if( active[next]().length ){
						active[next]().addClass('active');
					}else{
						$input.val(currentValue);
						timepick = false;
					}
				}else{
					$dropdown.children().eq(key==ARROWDOWN?0:-1).addClass('active');
				}
				
				if( timepick ){
					$input.trigger('timepick.xdsoft');
				}
				
				event.preventDefault();
				return false;
			break;	

		}
		return;
	}
	
	$input
		.data('xdsoft_autocomplete',dataset)
		.after($box)
		.on('pick.xdsoft', function( event,_value ){

			$input
				.trigger('timepick.xdsoft',_value)
			
			currentSelect = currentValue = $input.val();
			
			$input
				.trigger('close.xdsoft');
			
			currentInput = false;
			
			active = $dropdown.find('div.active').eq(0);
						
			if( !active.length )
				active = $dropdown.children().first();
				
			$input.trigger('selected.xdsoft',[getItem(active,dataset)]);
		})
		.on('timepick.xdsoft', function( event,_value ){
			active = $dropdown.find('div.active');
						
			if( !active.length )
				active = $dropdown.children().first();
			
			if( active.length ){
				if( !isset(_value) ){
					$input.val(getValue.call(options,active,dataset));
				}else{
					$input.val(_value);
				}
				$input.trigger('autocompleted.xdsoft',[getItem(active,dataset)]);
				$hint.html('');
				setCaretPosition($input[0],$input.val().length);
			}
		})
		.on('keydown.xdsoft keypress.xdsoft input.xdsoft cut.xdsoft paste.xdsoft', function( event ){
			var ret = manageKey(event);
			
			if( ret===false || ret===true )
				return ret;
			
			!iOpen && $input.trigger('open.xdsoft');
			
			setTimeout(function(){
				manageData();
			},1);
			
			return manageData();
		});
	
	currentValue = $input.val();
	
	collectData.call(options, $input.val(),function( data,query ){
		dataset = processData.call(options,data,query);
	});
	
	if( options.openOnFocus )
		$input.on('focusin.xdsoft',function(){
			$input.trigger('updateContent.xdsoft open.xdsoft');
		});
		
	if( options.closeOnBlur )
		$input.on('focusout.xdsoft',function(){
			$input.trigger('close.xdsoft');
		});
		
	$box
		.append($input)
		.append($dropdown);


	var olderBackground = false,
		timerUpdate = 0;
	
	$input
		.on('updateHelperPosition.xdsoft',function(){
			clearTimeout(timerUpdate);
			timerUpdate = setTimeout(function(){

				$dropdown.css($.extend(true,{
					left:$input.position().left,
					top:$input.position().top+parseInt($input.css('marginTop'))+parseInt($input[0].offsetHeight),
					marginLeft:$input.css('marginLeft'),
					marginRight:$input.css('marginRight'),
					width:options.dropdownWidth=='100%'?$input[0].offsetWidth:options.dropdownWidth
				},options.dropdownStyle));
				
				if( options.showHint ){
					var style = getComputedStyle($input[0], "");
					
					$hint[0].style.cssText = style.cssText;
					
					$hint.css({
						'box-sizing':style.boxSizing,
						borderStyle:'solid',
						borderCollapse:style.borderCollapse,
						borderLeftWidth:style.borderLeftWidth,
						borderRightWidth:style.borderRightWidth,
						borderTopWidth:style.borderTopWidth,
						borderBottomWidth:style.borderBottomWidth,
						paddingBottom:style.paddingBottom,
						marginBottom:style.marginBottom,
						paddingTop:style.paddingTop,
						marginTop:style.marginTop,
						paddingLeft:style.paddingLeft,
						marginLeft:style.marginLeft,
						paddingRight:style.paddingRight,
						marginRight:style.marginRight,
						maxHeight:style.maxHeight,
						minHeight:style.minHeight,
						maxWidth:style.maxWidth,
						minWidth:style.minWidth,
						width:style.width,
						letterSpacing:style.letterSpacing,
						lineHeight:style.lineHeight,
						outlineWidth:style.outlineWidth,
						fontFamily:style.fontFamily,
						fontVariant:style.fontVariant,
						fontStyle:style.fontStyle,
						fontSize:style.fontSize,
						fontWeight:style.fontWeight,
						flex:style.flex,
						justifyContent:style.justifyContent,
						borderRadius:style.borderRadius,
						'-webkit-box-shadow':'none',
						'box-shadow':'none'
					});
					
					$input.css('font-size',style.fontSize)// fix bug with em font size
					
					$hint.innerHeight($input.innerHeight());
					
					$hint.css($.extend(true,{
						position:'absolute',
						zIndex:'1',
						borderColor:'transparent',
						outlineColor:'transparent',
						left:'0px',
						top:'0px',
						background:$input.css('background')
					},options.hintStyle));
					
					if( olderBackground!==false ){
						$hint.css('background',olderBackground);
					}else{
						olderBackground = $input.css('background');
					}
					
					$input
						.css('background','transparent')
					$box
						.append($hint);
				}
			},options.timeoutUpdate||1);
		})
		.trigger('updateHelperPosition.xdsoft')
		
		.on('close.xdsoft',function(){
			if( !iOpen )
				return;
				
			$dropdown
				.hide();
			
			$hint
				.empty();	

			if( !options.autoselect )
				$input.val(currentValue);
				
			iOpen = false;

			currentInput = false;
		})
		
		.on('updateContent.xdsoft',function(){
			var out = renderData.call(options,dataset,$input.val());
			
			$(out).each(function(){
				this.css($.extend(true,{
					paddingLeft:$input.css('paddingLeft'),
					paddingRight:$input.css('paddingRight')
				},options.itemStyle));
			});
			
			$dropdown
				.html(out);
		})
		
		.on('open.xdsoft',function(){
			if( iOpen )
				return;
			
			$dropdown
				.show()

			iOpen = true;
				
			currentInput = $input;
		})
		.on('destroy.xdsoft',function(){
			$input.removeClass('xdsoft');
			$box.after($input);
			$box.remove();
			delete $box;
			clearTimeout(timer1);
			currentInput = false;
			$input.data('xdsoft_autocomplete',null);
			$input
				.off('.xdsoft')
		});
};

$.fn.autocomplete = function( _options ){
	if( _options=='destroy' )
		return this.trigger('destroy.xdsoft');
	if( _options=='update' )
		return this.trigger('updateHelperPosition.xdsoft');	
		
	var options = $.extend(true,{},defaultSetting,_options);

	return this.each(function(){
		init(this,options);
	});
};
}(jQuery);
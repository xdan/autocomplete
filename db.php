<?php
if( !class_exists('Timer') ){
class Timer{
	private $start_time;
	private function get_time(){
		list($usec, $seconds) = explode(" ", microtime());
		return ((float)$usec + (float)$seconds);
	}
	
	function start(){
		return $this->start_time = $this->get_time();
	}
	
	function end($startTime=false){
		return $this->get_time() - ((!$startTime)?$this->start_time:$startTime);
	}
}
}
/**
 * @class   	db
 * @author 	leroy <skoder@ya.ru>
 * @site 	http://xdan.ru
 * @version 	1.8.2
 */
class db{
	public $sql = '';
	public $inq = '';
	public $sqlcount = 0;
	public $pfx = '';
	private $connid = 0;
	private $_logid = 0; // если указать 1 то будет лошировать всеоперации
	
	public $email = 'mail@mail.ru'; // на это ящик будут идти сообщения
	
	private function logger($msg,$time){
		@file_put_contents(dirname(__FILE__).'/.mlog',$time.'-'.$msg."\n",FILE_APPEND);
	}
	/**
	 * При инициализации пдключаетсяк MySQL и подключается к нужной БД
	 * 
	 * @param $server название хоста
	 * @param $user логин
	 * @param $password пароль
	 * @param $dbname название бд
	 * @param $pfx префикс таблиц, по умолчанию pfx_, т.е. в любом запросе к названию таблиц 
	 * будет добавлятся pfx_
	 * @param $charset кодировка
	 */
	function __construct( $server, $user, $password,$dbname,$pfx='pfx_',$charset="utf8" ){
		if( $this->_logid ){
			$this->timer = new Timer;
			$this->timer->start();
		}
		if( $this->connid = @mysql_connect($server, $user, $password) ){
			$this->pfx = $pfx;
			if( mysql_select_db($dbname, $this->connid) ){
				$this->query("SET NAMES '".$charset."'") && $this->query("SET CHARSET '".$charset."'") && $this->query("SET CHARACTER SET '".$charset."'") && $this->query("SET SESSION collation_connection = '{$charset}_general_ci'");
			}
			$this->_logid&&$this->logger('Время на подключение к '.$user.' '.$dbname,$this->timer->end()); // время на операцию
		}else{
			$this->error();
		}
	}
	
	/**
	 * Выполняет SQL запрос, заменяя #_ на заданный в настройках префикс 
	 */
	function query($sql){
		$this->_logid&&$this->timer->start();
		$this->sql = str_replace('#_',$this->pfx,$sql);
		$this->sqlcount++;
		($this->inq = mysql_query($this->sql,$this->connid))||$this->error();
		$this->_logid&&$this->logger($this->sql,$this->timer->end());
		return $this->inq;
	}
	
	/**
	 * Возвращает последний выполненный запрос
	 */
	function last(){
		return $this->sql;
	}
	
	/**
	 * Возвращает одну запись из БД соответствующую запросу
	 *
	 * @param $sql SQL запрос
	 * @param $field если не задано то возвращается вся запись, иначе возвращается значение поля $field
	 * @example $db->getRow('select * from #_book where id=12'); // вернет array('id'=>12,'name'=>'Tolkien' ...)
	 * @example $db->getRow('select name from #_book where id=12',name); // вернет 'Tolkien'
	 */
	function getRow( $sql,$field='' ){
		$item = mysql_fetch_array($this->query($sql));
		return ($field=='')?$item:$item[$field]; 
	}
	
	 
	/**
	 * Перебирает все записи из запроса и передает их в callback функцию
	 *
	 * @param $sql SQL запрос, с префиксом #_ 
	 * @param $callback функция, вызываемая к каждой записи запроса, 
	 * в параметрах 1) массив, содержащий данные полученной записи 2)указатель на db
	 * @return Возвращает db
	 */
	public function each( $sql,$callback ){
		$inq = $this->query($sql);
		if( is_callable($callback) )
			while($item = mysql_fetch_array($inq))
				call_user_func($callback,$item,$this);
		return $this;
	}
	
	/**
	 * Изымает лишь запись по ее идентификатору, по умолчанию id
	 *
	 * @param $sTable название таблицы без префикса
	 * @param $id значение идентификатора
	 * @param $fieldname поле по которому производится сравнение, по умолчанию id
	 * @param $field значение поля, которое необходимо вернуть. Если не указано то возвращается вся запись
	 * @return ассоциативный массив либо конкретное значение пи заданном $field
	 * @example $db->getRowById('book',12); // вернет запись о книге с id=12
	 * @example $db->getRowById('book','Tolkien','name'); // вернет запись о книге с названием которое содержит Tolkien
	 * @example $db->getRowById('book',12,'id','name'); // вернет название книги с id=12
	 */
	public function getRowById( $sTable, $id,$fieldname='id',$field='' ) {
		return $this->getRow("SELECT * FROM `#_".$sTable."` WHERE `$fieldname` ='".$this->escape($id)."' limit 1",$field);
	}
	
	/**
	 * Проверяет существует ли запись в таблице с таким идентификатором, если существует то возвращает идентификатор
	 * иначе возвращает false
	 *
	 * @param $sTable название таблицы без префикса
	 * @param $id значение идентификатора
	 * @param $fieldname поле по которому производится сравнение, по умолчанию id
	 * @param $allf дополнительные параметры запроса, обычное sql сравнение
	 * @param $field поле которое необходимо вернуть в случае удачи, по умолчанию равно $fieldname
	 * @return При удаче возвращает значение поля $field, иначе false
	 * @example if( $db->exists('book',12) ) echo 'Книга существует';
	 * @example if( $db->exists('book','Tolkien','name')!==false ) echo 'Книга содерщащая Tolkien существует';
	 * @example if( $db->exists('book','Tolkien','name','active="yes" and public="12.09.2008"') ) 
	 *	echo 'Книга содерщащая Tolkien опубликованная 12.09.2008 существует';
	 * @example if( ($name=$db->exists('book','%Tolkien%','name','','izdatel'))!==false ) 
	 *	echo 'Книга содерщащая Tolkien существует ее издал '.$name;
	 */
	public function exists($sTable,$id,$fieldname='id',$allf='',$field = ''){
		if( !$field )
			$field = $fieldname;
		$item = $this->getRow('select '.$field.' from '.$this->pfx.$sTable.' where `'.$fieldname.'`=\''.$this->escape($id).'\' '.$allf);
		return isset($item[$field])?$item[$field]:false;
	}
	
	/**
	 * @deprecated 1.7 Используйте getRows
	 */
	function loadResults( $sql,$field = '' ){
		return $this->getRows($sql,$field);
	}
	/**
	 * Выдает массив всех записей из запроса
	 *
	 * @param $sql SQL запрос, с префиксом #_ 
	 * @param $field если указано это поле, то результирующий массив будет состоять только из значений этого поля
	 * @return Array
	 */
	function getRows( $sql,$field = '' ){
		$inq = $this->query($sql);$items = array();
		while($item = @mysql_fetch_array($inq)) $items[] = ($field=='')?$item:$item[$field]; 
		return $items;
	}
	
	/**
	 * Возвращает все записи из таблицы
	 */
	function getAll( $table,$fields='*',$field='' ){
		return  $this->getRows('select '.$fields.' from `#_'.$table.'`',$field);
	}
	
	/*
	 * Возвращает ip пользователя
	 */
	private function myIP(){
	    $ipa = explode( ',',@$_SERVER['HTTP_X_FORWARDED_FOR'] );
	    $ip = isset($_SERVER['HTTP_X_REAL_IP'])?$_SERVER['HTTP_X_REAL_IP']:(isset($_SERVER['REMOTE_ADDR'])?$_SERVER['REMOTE_ADDR']:(!empty($ipa[0])?$ipa[0]:'127.0.0.1'));
	    return preg_match('#^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$#',$ip)?$ip:'127.0.0.1';
	}
 
	public $checkAttack = true;
	private $attackBuffer = array();
	public $stopAttack = false;
	 
	/*
	 * Проверяет есть ли запрещенные слова и символы в экранируемом выражении
	 */
	function isItAttack( $id ){
	    if( $this->checkAttack and !in_array($id,$this->attackBuffer) ){
	        $hook = 0 ;
	        if( 
	            (preg_match('/[\']/', $id) and $hook=1) or
	            (preg_match('/(and|null|not)/i', $id) and $hook=3) or
	            (preg_match('/(union|select|from|where)/i', $id) and $hook=4)or
	            (preg_match('/(group|order|having|limit)/i', $id) and $hook=5) or
	            (preg_match('/(into|file|case)/i', $id) and $hook=6) or
	            (preg_match('/--|#|\/\*/', $id) and $hook=7)
	        ){
	            $this->attackBuffer[] = $id;
	            mail($this->email,'Attack rutaxi.ru',"Site was be attacked - \n\n".
	                "value:".$id."\n\n".
	                "hook:".$hook."\n\n".
	                "ip:".$this->myIP()."\n\n".
	                "request:".$_SERVER['REQUEST_URI']."\n\n".
	                "REQUEST:".var_export($_REQUEST,true));
	            if( $this->stopAttack ){
	                header('HTTP/1.1 500 Internal Server Error');
	                throw new Exception('Divizion by zerro');
	                exit();
	            }
	            return true;
	        }
	    }
	    return false;
	}
	
	/**
	 * Экранирует значение
	 */
	function escape($value){
	    $this->isItAttack($value);
	    return mysql_real_escape_string($value,$this->connid);
	}

		
	/**
	 * Вставка данных в таблицу
	 *
	 * @param $sTable название таблицы без префикса
	 * @param $values либо строка вида id=12,name="Tolkien", 
	 * либо ассоциативный массив вида array('id'=>12,'name'=>'Tolkien')
	 * в случае ассоциативного массива экранировать данные не требуется
	 * @example $db->insert('book','id=12,name="'.$db->escape('Tolkien').'"');
	 * @example $db->insert('book',array('id'=>12,'name'='Tolkien'));
	 */
	function insert( $sTable,$values ){
		$ret = $this->_arrayKeysToSet($values);
		return $this->query('insert into #_'.$sTable.' set '.$ret);
	  return false;
	}
	
	/**
	 * Возвращает значение перичного ключа последней вставленной записи
	 */
	function insertid(){
		return mysql_insert_id($this->connid);
	}
	
	/**
	 * Обновление данных в таблице
	 *
	 * @param $sTable название таблицы без префикса
	 * @param $values либо строка вида id=12,name="Tolkien", 
	 * либо ассоциативный массив вида array('id'=>12,'name'=>'Tolkien')
	 * в случае ассоциативного массива экранировать данные не требуется
	 * @param $sWhere условия соответсвия
	 * @example $db->update('book','id=12,name="'.$db->escape('Tolkien').'"','id=5');
	 * @example $db->update('book',array('id'=>12,'name'='Tolkien'),'where name like %Tolkien%');
	 */
	public function update( $sTable, $values, $sWhere=1 ){
		$ret = $this->_arrayKeysToSet($values);
		return $this->query('update '.$this->pfx.$sTable.' set '.$ret.' where '.$sWhere);
	}
	/**
	 * Удаление данных соответствующих словию
	 */
	public function delete( $sTable, $sWhere ){
		return $this->query('delete from '.$this->pfx.$sTable.' where '.$sWhere);
	}
	
	
	private function _arrayKeysToSet($values){
		 $ret='';
		  if( is_array($values) ){
			foreach($values as $key=>$value){
			  if(!empty($ret))$ret.=',';
			  $ret.="`$key`='".$this->escape($value)."'";
			}
		  }else $ret=$values;
		  return $ret;
	}
	private function error(){
		$langcharset = 'utf-8';
		$out = '';
		$out.="<HTML>\n";
		$out.="<HEAD>\n";
		$out.="<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=".$langcharset."\">\n";
		$out.="<TITLE>MySQL Debugging</TITLE>\n";
		$out.="</HEAD>\n";
		$out.="<div style=\"border:1px dotted #000000; font-size:11px; font-family:tahoma,verdana,arial; background-color:#f3f3f3; color:#A73C3C; margin:5px; padding:5px;\">\n";
		$out.="<b><font style=\"color:#666666;\">MySQL Debugging</font></b><br /><br />\n";
		$out.="<li><b>SQL.q :</b> <font style=\"color:#666666;\">".$this->sql."</font></li>\n";
		$out.="<li><b>MySQL.e :</b> <font style=\"color:#666666;\">".mysql_error()."</font></li>\n";
		$out.="<li><b>MySQL.e.№ :</b> <font style=\"color:#666666;\">".mysql_errno()."</font></li>\n";
		$out.="<li><b>PHP.v :</b> <font style=\"color:#666666;\">".phpversion()."\n</font></li>\n";
		$out.="<li><b>Data :</b> <font style=\"color:#666666;\">".date("d.m.Y H:i")."\n</font></li>\n";
		$out.="<li><b>Script :</b> <font style=\"color:#666666;\">".getenv("REQUEST_URI")."</font></li>\n";
		$out.="<li><b>Refer :</b> <font style=\"color:#666666;\">".getenv("HTTP_REFERER")."</li></div>\n";
		$out.="</BODY>\n";
		$out.="</HTML>\n\n";
		file_put_contents('log.log',$out,FILE_APPEND);
		exit($out);
	}
}

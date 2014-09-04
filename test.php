<?php
include 'db.php';
$db = new db('127.0.0.1','root','parol','abc','hnd_');
$results = $db->getRows('select name as title,id as value from #_models where name like "%'.$db->escape($_REQUEST['query']).'%" order by name limit 100');
exit(json_encode($results));
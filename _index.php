<?php

if( str_contains($_SERVER['HTTP_HOST'],'junkmeter') )
{
    header('Location: https://junkometer.com');
    exit;
}

readfile('index.html');

?>



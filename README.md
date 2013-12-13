This repo represents the current state of the steelseries javascript canvas port.
There is no documentation or build automation, yet.


The minified versions are produced (generally!) using the Microsoft Ajax Minifier:
http://ajaxmin.codeplex.com/

I use the following simple batch file:
@echo Minifying %~n1 to %~n1.min.js ...
@"C:\Program Files (x86)\Microsoft\Microsoft Ajax Minifier\ajaxmin.exe" -JS "%1" -clobber:true -out "%~p1%~n1-min.js" -enc:in utf-8

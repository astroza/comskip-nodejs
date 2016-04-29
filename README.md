# README #


### NodeJS ###

```
#!bash

cat << __END__ >> /etc/apt/sources.list.d/nodesource.list
deb https://deb.nodesource.com/node_4.x trusty main
deb-src https://deb.nodesource.com/node_4.x trusty main
__END__

wget -qO - https://deb.nodesource.com/gpgkey/nodesource.gpg.key | sudo apt-key add -
apt-get update
apt-get install nodejs

```

### Installation ###

```
#!bash

npm install -g git@bitbucket.org:nedcl/comskip-nodejs.git
```
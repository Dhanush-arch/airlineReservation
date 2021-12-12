create database airlineReservationDB;
use airlineReservationDB;

drop table accounts;
drop table flights;
drop table tickets;

create table accounts (id int primary key auto_increment, username varchar(100) unique, password varchar(100), isadmin boolean);
insert into accounts values (null, "admin", "admin", true);
insert into accounts values (null, "test", "test", false);
select * from accounts;

-- yyy-mm-dd hh:mm:ss 
create table flights(id int primary key auto_increment, source varchar(100), destination varchar(100), depdate datetime, seatsAvailable int);
insert into flights values (null, "chennai", "mumbai", '2021-12-14 14:00:45', 30);
insert into flights values (null, "Bangalore", "Dubai", '2021-12-15 14:00:45', 30);
select * from flights;
SELECT seatsAvailable FROM flights WHERE id = 1;

create table tickets(id int primary key auto_increment, firstname varchar(100), lastname varchar(100), age int, flight int, owner int, foreign key(flight) references flights(id), foreign key(owner) references accounts(id));
select * from tickets;

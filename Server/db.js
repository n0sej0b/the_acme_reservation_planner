const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/acme_reservation_db');
const uuid = require('uuid');


const createTables = async() => {
   const SQL = `
   drop table if exists reservations;
   drop table if exists restaurants;
   drop table if exists customers;
   create table customers(
        id UUID PRIMARY KEY,
        name varchar(55) not null unique
        );
    create table restaurants(
    id UUID PRIMARY KEY,
    name varchar(55) not null unique
    );

    create table reservations(
        id UUID PRIMARY KEY,
        date date not null,
        party_count integer not null,
        restaurant_id UUID references restaurants(id) not null,
        customer_id UUID references customers(id) not null
        );
     `;
    await client.query(SQL);
};

const createCustomer = async ({name}) => {
    const SQL = `
        insert into customers(id, name) values($1, $2) returning *
    `;
    const response = await client.query(SQL, [uuid.v4(), name]);
    return response.rows[0];
}


const createRestaurant = async ({name}) => {
    const SQL = `
        insert into restaurants(id, name) values($1, $2) returning *
    `;
    const response = await client.query(SQL, [uuid.v4(), name]);
    return response.rows[0];
}

const fetchCustomers = async () => {
    const SQL =`
    select * from customers
    `;
    const response = await client.query(SQL);
    return response.rows;
};


const fetchRestaurants = async () => {
    const SQL =`
    select * from restaurants
    `;
    const response = await client.query(SQL);
    return response.rows;
};

const createReservations = async ({ name, restaurant_name, party_count, date }) => {
    const SQL = `
    insert into reservations(id, customer_id, restaurant_id, party_count, date) values($1, (select id from customers where name = $2), (select id from restaurants where name = $3), $4, $5) returning *
    `;
    const response = await client.query(SQL, [uuid.v4(), name, restaurant_name, party_count, date]);
    return response.rows[0];
};

const fetchReservations = async () => {
    const SQL = `
    select id, date, party_count, restaurant_id, customer_id from reservations
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const destroyReservations = async ({ id, customer_id}) => {
    console.log(id, customer_id)
    const SQL = `
        delete from reservations
        where id=$1 and customer_id=$2
    `;
    await client.query(SQL, [id, customer_id]);
};

module.exports = {
    client,
    createTables,
    createCustomer,
    createRestaurant,
    fetchCustomers,
    fetchRestaurants,
    fetchReservations,
    createReservations,
    destroyReservations
};
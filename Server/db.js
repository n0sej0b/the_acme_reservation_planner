const pg = require('pg');
const { v4: uuidv4 } = require('uuid'); 


const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost/acme_reservation_db',
    max: 20,  
});


const executeQuery = async (query, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    } finally {
        client.release();
    }
};

const createTables = async () => {
    const SQL = `
        DROP TABLE IF EXISTS reservations;
        DROP TABLE IF EXISTS restaurants;
        DROP TABLE IF EXISTS customers;

        CREATE TABLE customers (
            id UUID PRIMARY KEY,
            name VARCHAR(55) NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE restaurants (
            id UUID PRIMARY KEY,
            name VARCHAR(55) NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE reservations (
            id UUID PRIMARY KEY,
            date DATE NOT NULL,
            party_count INTEGER NOT NULL CHECK (party_count > 0),
            restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
            customer_id UUID REFERENCES customers(id) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_reservations_date ON reservations(date);
        CREATE INDEX idx_reservations_customer ON reservations(customer_id);
        CREATE INDEX idx_reservations_restaurant ON reservations(restaurant_id);
    `;
    
    try {
        await executeQuery(SQL);
    } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
    }
};

const createCustomer = async ({ name }) => {
    if (!name || typeof name !== 'string') {
        throw new Error('Valid customer name is required');
    }

    const SQL = `
        INSERT INTO customers(id, name) 
        VALUES($1, $2) 
        RETURNING *
    `;
    
    try {
        const [customer] = await executeQuery(SQL, [uuidv4(), name.trim()]);
        return customer;
    } catch (error) {
        if (error.code === '23505') { // unique violation
            throw new Error(`Customer with name ${name} already exists`);
        }
        throw error;
    }
};

const createRestaurant = async ({ name }) => {
    if (!name || typeof name !== 'string') {
        throw new Error('Valid restaurant name is required');
    }

    const SQL = `
        INSERT INTO restaurants(id, name) 
        VALUES($1, $2) 
        RETURNING *
    `;
    
    try {
        const [restaurant] = await executeQuery(SQL, [uuidv4(), name.trim()]);
        return restaurant;
    } catch (error) {
        if (error.code === '23505') {
            throw new Error(`Restaurant with name ${name} already exists`);
        }
        throw error;
    }
};

const fetchCustomers = async () => {
    const SQL = `
        SELECT * FROM customers 
        ORDER BY name
    `;
    return await executeQuery(SQL);
};

const fetchRestaurants = async () => {
    const SQL = `
        SELECT * FROM restaurants 
        ORDER BY name
    `;
    return await executeQuery(SQL);
};

const createReservations = async ({ name, restaurant_name, party_count, date }) => {
    if (!name || !restaurant_name || !party_count || !date) {
        throw new Error('All fields are required for reservation');
    }

    if (party_count <= 0) {
        throw new Error('Party count must be greater than 0');
    }

    const SQL = `
        INSERT INTO reservations(id, customer_id, restaurant_id, party_count, date) 
        VALUES(
            $1, 
            (SELECT id FROM customers WHERE name = $2), 
            (SELECT id FROM restaurants WHERE name = $3), 
            $4, 
            $5
        ) 
        RETURNING *
    `;
    
    try {
        const [reservation] = await executeQuery(SQL, [
            uuidv4(), 
            name, 
            restaurant_name, 
            party_count, 
            date
        ]);
        return reservation;
    } catch (error) {
        if (error.code === '23503') { 
            throw new Error('Customer or restaurant not found');
        }
        throw error;
    }
};

const fetchReservations = async () => {
    const SQL = `
        SELECT 
            r.id,
            r.date,
            r.party_count,
            c.name as customer_name,
            rest.name as restaurant_name
        FROM reservations r
        JOIN customers c ON r.customer_id = c.id
        JOIN restaurants rest ON r.restaurant_id = rest.id
        ORDER BY r.date DESC
    `;
    return await executeQuery(SQL);
};

const destroyReservations = async ({ id, customer_id }) => {
    if (!id || !customer_id) {
        throw new Error('Reservation ID and customer ID are required');
    }

    const SQL = `
        DELETE FROM reservations
        WHERE id = $1 AND customer_id = $2
        RETURNING *
    `;
    
    const [deleted] = await executeQuery(SQL, [id, customer_id]);
    if (!deleted) {
        throw new Error('Reservation not found or unauthorized');
    }
    return deleted;
};

// Cleanup function for graceful shutdown
const cleanup = async () => {
    try {
        await pool.end();
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
    pool,
    createTables,
    createCustomer,
    createRestaurant,
    fetchCustomers,
    fetchRestaurants,
    fetchReservations,
    createReservations,
    destroyReservations
};
// Finished
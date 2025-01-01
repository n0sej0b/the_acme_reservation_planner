const express = require('express');
const app = express();
app.use(express.json());

const { 
    client, 
    createTables, 
    createCustomer, 
    createRestaurant,
    fetchCustomers, 
    fetchRestaurants,
    fetchReservations,
    createReservations,
    destroyReservations
} = require('./db');


app.get('/api/customers', async(req, res, next) => {
    try{
        res.send(await fetchCustomers());
    } catch(ex) {
        next(ex);
    }
});

app.get('/api/restaurants', async(req, res, next) => {
    try{
        res.send(await fetchRestaurants());
    } catch(ex) {
        next(ex);
    }
});

app.get('/api/reservations', async(req, res, next) => {
    try{
        res.send(await fetchReservations());
    } catch(ex) {
        next(ex);
    }
});

app.post('/api/customers/:name/reservations', async(req, res, next) => {
    try{
        res.status(201).send(await createReservations({name: req.params.name, restaurant_name: req.body.restaurant_name, date: req.body.date, party_count: req.body.party_count}))
    } catch(ex) {
        next(ex);
    }
})

app.delete('/api/customers/:customer_id/reservations/:id', async(req, res, next) => {
    try{
        await destroyReservations({customer_id: req.params.customer_id, id:req.params.id});
        res.sendStatus(204);
    } catch(ex) {
        next(ex);
    }
});




const init = async() => {
    try {
      console.log('connecting to db');
      await client.connect();
      console.log('connected to db');
      await createTables();
      
      // Batch create operations
      const customerData = [
        { name: 'Sally' },
        { name: 'Nick' },
        { name: 'Zack' }
      ];
      const restaurantData = [
        { name: 'Bobs' },
        { name: 'Daves' },
        { name: 'AcSlater' },
        { name: 'BadDaddies' }
      ];
      
      const [customers, restaurants] = await Promise.all([
        Promise.all(customerData.map(c => createCustomer(c))),
        Promise.all(restaurantData.map(r => createRestaurant(r)))
      ]);
      
      // Server startup
      const port = process.env.PORT || 3000;
      app.listen(port, () => console.log(`listening on port ${port}`));
    } catch (error) {
      console.error('Initialization failed:', error);
      process.exit(1);
    }
  };
  

init();
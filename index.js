const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9bzbqn1.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){

  const authHeader = req.headers.authorization;
  if(!authHeader){
     return res.status(401).send('unauthorized access')
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
      if(err){
        return res.status(403).send({message: 'forbidden access'})
      }
      req.decoded = decoded;
      next();
  })
}

async function run(){
  try{
    const categoryCollection = client.db('TechMate')
.collection('categories');
const categoryProductCollection = client.db('TechMate')
.collection('products');
const blogCollection = client.db('TechMate')
.collection('blog');
const usersCollection = client.db('TechMate').collection('users');
const bookingsCollection = client.db('TechMate').collection('bookings');
const wishlistCollection = client.db('TechMate').collection('wishlist');

const verifyAdmin = async(req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);

  if(user?.role !== 'admin'){
      return res.status(403).send({ message: 'forbidden access'})
  }
  next();
};

const verifySeller = async(req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);

  if(user?.role !== 'seller'){
      return res.status(403).send({ message: 'forbidden access'})
  }
  next();
};

app.post('/bookings', async(req, res) =>{
  const booking = req.body
  console.log(booking);
   const query = {
       email: booking.email,
       name: booking.name,
   }
  const result = await bookingsCollection.insertOne(booking);
  res.send(result);
});
app.get('/bookings', verifyJWT, async(req, res) =>{
  const email = req.query.email;
  const decodedEmail = req.decoded.email;

  if(email !== decodedEmail){
      return res.status(403).send({message: 'forbidden access'});
  }

  const query = {email: email};
  const bookings = await bookingsCollection.find(query).toArray();
  res.send(bookings);
});

app.get('/bookings/:id', async(req, res) =>{
  const id = req.params.id;
  const query = { _id: ObjectId(id) } ;
  const booking = await bookingsCollection.findOne(query);
 res.send(booking); 
})

app.post('/wishlist', async(req, res) =>{
  const selectedItem = req.body
  console.log(selectedItem);
   const query = {
       email: selectedItem.email,
       name: selectedItem.name,
   }
  const result = await wishlistCollection.insertOne(selectedItem);
  res.send(result);
});

app.get('/wishlist', verifyJWT, async(req, res) =>{
  const email = req.query.email;
  const decodedEmail = req.decoded.email;

  if(email !== decodedEmail){
      return res.status(403).send({message: 'forbidden access'});
  }

  app.get('/wishlist/:id', async(req, res) =>{
    const id = req.params.id;
    const query = { _id: ObjectId(id) } ;
    const result = await wishlistCollection.findOne(query);
   res.send(result); 
  })

  const query = {email: email};
  const wishList = await wishlistCollection.find(query).toArray();
  res.send(wishList);
});

app.get( '/product-categories', async (req, res) =>{
  const cursor = categoryCollection.find({})
  const categories = await cursor.toArray();
  res.send(categories);
})
app.get('/category/:id', async(req, res) => {
  const id = req.params.id;
  const query = {};
  const products = await categoryProductCollection.find(query).toArray();
  const category_products = products.filter(p => p.category_id === id);
  res.send(category_products);
  });

  app.post('/products', verifyJWT, verifySeller, async(req, res) =>{
    const product = req.body;
    const result = await categoryProductCollection.insertOne(product);
    product.category_id = product.insertedId;
    res.send(product);
 });
app.get( '/products', async (req, res) =>{
  const cursor = categoryProductCollection.find({})
  const allProduct = await cursor.toArray();
  res.send(allProduct);
})
app.get('/products/:id', async(req, res) => {
  const id = req.params.id;
  const query = {_id: ObjectId(id)};
  const product = await categoryProductCollection.findOne(query);
  res.send(product);
});
  app.get( '/blog', async (req, res) =>{
    const cursor = blogCollection.find({})
    const blog = await cursor.toArray();
    res.send(blog);
  })
  app.get('/jwt', async(req, res) =>{
    const email = req.query.email;
    const query = {email: email};
    const user = await usersCollection.findOne(query);
    if(user){
      const token = jwt.sign({email}, process.env.ACCESS_TOKEN)
      // const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1day'})
        return res.send({accessToken: token}); 
    }
    res.status(403).send({accessToken: ''})
});
app.get('/users', async(req, res)=>{
  const query = {};
  const users = await usersCollection.find(query).toArray();
  res.send(users);
});
app.get('/users/admin/:email', async(req, res) =>{
  const email = req.params.email;
  const query = { email }
  const user = await usersCollection.findOne(query);
  res.send({isAdmin: user?.role === 'admin'});
});

app.get('/users/sellers/:email', async(req, res) =>{
  const email = req.params.email;
  const query = { email }
  const user = await usersCollection.findOne(query);
  res.send({isSeller: user?.role === 'seller'});
});

app.get('/users/sellers', async(req, res) => {
  const query = {};
  const users = await usersCollection.find(query).toArray();
  const sellers = users.filter(user => user?.role === 'seller');
  res.send(sellers);
  });

  app.get('/users/buyers', async(req, res) => {
    const query = {};
    const users = await usersCollection.find(query).toArray();
    const buyers = users.filter(user => user?.role !=='admin' && user?.role !== 'seller');
    res.send(buyers);
    });

app.post('/users', async(req, res) =>{
    const user = req.body;
    const result = await usersCollection.insertOne(user);
    res.send(result);
});

app.delete('/users/:id', verifyJWT, verifyAdmin, async(req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const result = await usersCollection.deleteOne(filter);
  res.send(result);
})


app.put('/users/admin/:id', verifyJWT,verifyAdmin, async(req, res) =>{
  const decodedEmail = req.decoded.email;
  const query = {email: decodedEmail};
  const user = await usersCollection.findOne(query);

  if(user?.role !== 'admin'){
    return res.status(403).send({message: 'forbidden access'})
  }

  const id = req.params.id;
  const filter = { _id: ObjectId(id) }
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: 'admin'
    }
  }
  const result = await usersCollection.updateOne(filter, updatedDoc, options);
  res.send(result);       
 });

app.put('/users/seller/:id', verifyJWT, verifyAdmin, async(req, res) =>{
  const id = req.params.id;
  const filter = { _id: ObjectId(id) }
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: 'seller'
    }
  }
  const result = await usersCollection.updateOne(filter, updatedDoc, options);
  res.send(result);       
 });

}
  finally{

  }
}
run().catch(err => console.log(err));

app.get('/', (req, res) => {
  res.send('TechMate API Running');
});

app.listen(port, () =>{
  console.log(`server running on port: ${port}`)
});









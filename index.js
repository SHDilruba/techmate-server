const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9bzbqn1.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const products = require('./data/products.json');

async function run() {
  try{
    const categoryCollection = client.db('TechMate')
.collection('categories');
const blogCollection = client.db('TechMate')
.collection('blog');

app.get( '/product-categories', async (req, res) =>{
  const cursor = categoryCollection.find({})
  const categories = await cursor.toArray();
  res.send(categories);
})
app.get('/category/:id', (req, res) => {
  const id = req.params.id;
      const category_products = products.filter(p => p.category_id === id);
      res.send(category_products);
  })
  app.get( '/blog', async (req, res) =>{
    const cursor = blogCollection.find({})
    const blog = await cursor.toArray();
    res.send(blog);
  })

}
  finally{

  }
}
run().catch(err => console.log(err));


app.listen(port, () =>{
  console.log(`server running on port: ${port}`)
});





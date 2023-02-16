const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9bzbqn1.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoryCollection = client.db("TechMate").collection("categories");
    const categoryProductCollection = client.db("TechMate").collection("products");
    const blogCollection = client.db("TechMate").collection("blog");
    const usersCollection = client.db("TechMate").collection("users");
    const bookingsCollection = client.db("TechMate").collection("bookings");
    const wishlistCollection = client.db("TechMate").collection("wishlist");
    const paymentsCollection = client.db('TechMate').collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
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

    app.get("/product-categories", async (req, res) => {
      const cursor = categoryCollection.find({});
      const categories = await cursor.toArray();
      res.send(categories);
    });

    app.get("/products/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = {};
      const products = await categoryProductCollection.find(query).toArray();
      const category_products = products.filter((p) => p.category_id === id);
      res.send(category_products);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = await categoryProductCollection.findOne(query);
      res.send(product);
    });

    app.get("/products", async (req, res) => {
      const cursor = categoryProductCollection.find({});
      const products = await cursor.toArray();
      res.send(products);
    });

    app.post("/addProduct", async (req, res) => {
      const product = req.body;
      const result = await categoryProductCollection.insertOne(product);
      console.log(result);
      product.category_id = product.insertedId;
      res.send(product);
    });

    app.delete("/products/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await categoryProductCollection.deleteOne(filter);
      res.send(result);
    });

        app.put("/products/paid/:name", verifyJWT, async (req, res) => {
      const name = req.params.name;
      const filter = { name: name };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          paid: true,
        },
      };
      const result = await categoryProductCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const query = {
        email: booking.email,
        name: booking.name,
      };
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    app.delete("/bookings/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const  filter = { _id: new ObjectId(id) };
      const result= await bookingsCollection.deleteOne(filter);
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const selectedItem = req.body;
      console.log(selectedItem);
      const query = {
        email: selectedItem.email,
        name: selectedItem.name,
      };
      const result = await wishlistCollection.insertOne(selectedItem);
      res.send(result);
    });

    app.get("/wishlist", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      app.get("/wishlist/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await wishlistCollection.findOne(query);
        res.send(result);
      });

      app.delete("/wishlist/:id/", verifyJWT, async (req, res) => {
        const id = req.params.id;
        const  filter = { _id: new ObjectId(id) };
        const result= await wishlistCollection.deleteOne(filter);
        res.send(result);
      });

      const query = { email: email };
      const wishList = await wishlistCollection.find(query).toArray();
      res.send(wishList);
    });

    app.get("/blog", async (req, res) => {
      const cursor = blogCollection.find({});
      const blog = await cursor.toArray();
      res.send(blog);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.get("/users/sellers/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    app.get("/users/verify/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isVerifiedSeller: user?.seller_quality === "verified" });
    });

    app.get("/users/allSellers", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      const sellers = users.filter((user) => user?.role === "seller");
      res.send(sellers);
    });

    app.get("/myProducts", verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "unauthorized access" });
      }

      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = categoryProductCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    app.get("/users/buyers", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      const buyers = users.filter(
        (user) => user?.role !== "admin" && user?.role !== "seller"
      );
      res.send(buyers);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.put("/users/seller/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "seller",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.get("/advertisementProducts", async (req, res) => {
      const query = {};
      const products = await categoryProductCollection.find(query).toArray();
      const adsProducts = products.filter((product) => product?.advertisement === "done");
      res.send(adsProducts);
    });

    app.put("/products/advertise/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          advertisement: "done",
        },
      };
      const result = await categoryProductCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.put("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          seller_quality: "verified",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    
    app.post('/create-payment-intent', async(req, res)=>{
      const booking = req.body;
      const resale_price = booking.resale_price;
      const amount = resale_price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
         currency: 'usd', 
         amount: amount,
          "payment_method_types": [
            "card"
         ]
      });
      res.send({
         clientSecret: paymentIntent.client_secret,
      });
   });

 app.post('/payments', async (req, res) => {
     const payment = req.body;
     const result = await paymentsCollection.insertOne(payment);
     const id = payment.bookingId
     const filter = {_id: new ObjectId(id)}
     const updatedDoc = {
         $set: {
             paid: true,
             transactionId: payment.transactionId
         }
     }
     const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
     res.send(result);
 });

  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("TechMate API Running");
});

app.listen(port, () => {
  console.log(`server running on port: ${port}`);
});

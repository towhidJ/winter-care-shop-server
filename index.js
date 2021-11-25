const express = require("express");
const app = express();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { MongoClient } = require("mongodb");

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5cmdn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function run() {
    try {
        await client.connect();
        const database = client.db("winter_care");
        const productsCollection = database.collection("products");
        const ordersCollection = database.collection("orders");
        const usersCollection = database.collection("users");
        const contactsCollection = database.collection("contactus");
        const reviewsCollection = database.collection("reviews");

        app.get("/dashboard", async (req, res) => {
            const productCursor = productsCollection.find({});
            const productCount = await productCursor.count();
            const orderCursor = ordersCollection.find({});
            const orderCount = await orderCursor.count();
            const userCursor = usersCollection.find({});
            const userCount = await userCursor.count();
            res.send({ productCount, orderCount, userCount });
        });

        //Get Products
        app.get("/products", async (req, res) => {
            const cursor = productsCollection.find({}).sort({ _id: -1 });
            const count = await cursor.count();
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            if (page) {
                products = await cursor
                    .skip(page * size)
                    .limit(size)
                    .toArray();
            } else {
                products = await cursor.toArray();
            }

            res.send({
                count,
                products,
            });
        });

        //Delete Products
        app.delete("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        //Post Product
        app.post("/product", async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(product);
        });
        //Post Product
        app.post("/contactus", async (req, res) => {
            const contact = req.body;
            const result = await contactsCollection.insertOne(contact);
            res.json(result);
        });

        //use post to Get Order By Email
        app.post("/orders/byEmail", async (req, res) => {
            const email = req.body;
            const query = { email: email.email };

            const orders = await ordersCollection.find(query).toArray();
            res.json(orders);
        });

        //Get Order
        app.get("/orders", async (req, res) => {
            const cursor = ordersCollection.find({}).sort({ _id: -1 });
            const orders = await cursor.toArray();
            res.json(orders);
        });
        //Get Order by id
        app.get("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);

            res.json(order);
        });

        app.put("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment,
                },
            };
            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.json(result);
        });

        //Add orders
        app.post("/orders", async (req, res) => {
            const data = req.body;
            const order = await ordersCollection.insertOne(data);
            res.json(order);
        });

        //Updata Order status
        app.put("/status/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const data = req.body;
            const updateDoc = {
                $set: {
                    status: data.status,
                },
            };
            console.log(data);
            const order = await ordersCollection.updateOne(query, updateDoc);
            res.json(order);
        });

        //Delete Order
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        //Get Products

        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { email: email };

            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === "admin") {
                isAdmin = true;
            }

            res.json({ admin: isAdmin });
        });

        app.post("/users", async (req, res) => {
            const user = req.body;
            user.role = "user";
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put("/users", async (req, res) => {
            console.log(req.bosy);
            const user = req.body;
            const requester = user.email;
            const requesterAccount = await usersCollection.findOne({
                email: requester,
            });
            if (!requesterAccount) {
                user.role = "user";
            }
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            res.json(result);
        });

        //use post to Get Products By Key
        app.post("/products/byId", async (req, res) => {
            const keys = req.body;
            let a = [];
            for (const k of keys) {
                a.push(ObjectId(k));
            }

            const query = { _id: { $in: a } };
            console.log(query);
            const products = await productsCollection.find(query).toArray();
            console.log(products);
            res.json(products);
        });

        app.put("/users/admin", async (req, res) => {
            const user = req.body;
            const requester = user.adminMail;
            console.log(requester);
            if (requester) {
                const requesterAccount = await usersCollection.findOne({
                    email: requester,
                });
                if (requesterAccount.role === "admin") {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: "admin" } };
                    const result = await usersCollection.updateOne(
                        filter,
                        updateDoc
                    );
                    res.json(result);
                }
            } else {
                res.status(403).json({
                    message: "you do not have access to make admin",
                });
            }
        });

        //Get Review
        app.get("/reviews", async (req, res) => {
            const cursor = reviewsCollection.find({}).sort({ _id: -1 });
            const result = await cursor.toArray();
            res.json(result);
        });

        //Post Review
        app.post("/reviews", async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(result);
        });

        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                payment_method_types: ["card"],
            });
            res.json({ clientSecret: paymentIntent.client_secret });
        });
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Hello Customer!");
});

app.listen(port, () => {
    console.log(`listening at ${port}`);
});

// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id');
// app.delete('/users/:id')
// users: get
// users: post

const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const users = []; // will be deleted later

const isUserValid = (req, res, next) => {
  const { cpf } = req.headers;

  const user = users.find((user) => user.cpf === cpf);

  if (!user) {
    return res.status(400).json({ error: "User is not exist!" });
  }

  req.user = user;

  return next();
};

const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
};

app.get("/account", isUserValid, (req, res) => {
  const { user } = req;
  const { cpf, name, statement } = user;

  const amount = getBalance(statement);

  res.status(200).json({
    name: name,
    cpf: cpf,
    amount: amount,
  });
});

app.post("/account", (req, res) => {
  const { cpf, name } = req.body;

  const userAlreadyExists = users.some((user) => user.cpf === cpf);

  if (userAlreadyExists) {
    return res.status(400).json({ error: "User already exists!" });
  }

  users.push({
    id: uuidv4(),
    cpf,
    name,
    statement: [],
  });

  return res.status(201).json({ message: "User created successfully!" });
});

app.put("/account", isUserValid, (req, res) => {
  const { user } = req;
  const { name } = req.body;

  user.name = name;

  return res
    .status(201)
    .json({ message: `Your name has been updated to: ${name} .` });
});

app.delete("/account", isUserValid, (req, res) => {
  const { user } = req;

  users.splice(user, 1);

  res.status(200).json(users);
});

app.get("/balance", isUserValid, (req, res) => {
  const { user } = req;

  const balance = getBalance(user.statement);

  res.status(200).json({ amount: balance });
});

app.post("/deposit", isUserValid, (req, res) => {
  const { user } = req;
  const { description, amount } = req.body;

  const statementOperation = {
    id: uuidv4(),
    description,
    amount,
    create_at: new Date(),
    type: "credit",
  };

  user.statement.push(statementOperation);

  return res.status(201).send();
});

app.post("/withdraw", isUserValid, (req, res) => {
  const { user } = req;
  const { amount } = req.body;

  const balance = getBalance(user.statement);

  if (balance < amount) {
    return res.status(400).json({ error: "Insufficient amount to withdraw!" });
  }

  const statementOperation = {
    id: uuidv4(),
    amount,
    create_at: new Date(),
    type: "debit",
  };

  user.statement.push(statementOperation);

  return res.status(201).send();
});

app.get("/statement/", isUserValid, (req, res) => {
  const { user } = req;

  return res.json(user.statement);
});

app.get("/statement/date", isUserValid, (req, res) => {
  const { user } = req;
  const { date } = req.query;

  const dateFormatted = new Date(date + " 00:00");

  const statementByDate = user.statement.filter(
    (statement) =>
      statement.create_at.toDateString() ===
      new Date(dateFormatted).toDateString()
  );

  if (statementByDate.length === 0) {
    return res
      .status(400)
      .json({ error: "There aren't transition for this date!" });
  }

  return res.json(statementByDate);
});

const PORT = process.env.APP_PORT || 3333;

app.listen(PORT, () => {
  console.log(`🔥 Server started at port:${PORT}`);
});

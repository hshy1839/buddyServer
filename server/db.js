const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'fiveguys-dev-rds-1.creoc4kymucz.ap-northeast-2.rds.amazonaws.com',
  user: 'admin',
  password: 'awsrds!root2024',
  port :3306,
  database: 'buddy'
});
module.exports = connection;
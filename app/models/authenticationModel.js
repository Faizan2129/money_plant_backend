import { db, execQuery } from '../../db/db.js';


export const loginMdl = function (signupData, callback) {
  const QRY_TO_EXEC = `SELECT * FROM user WHERE email = ?`;
  const values = [signupData.userEmail];

  execQuery(db, QRY_TO_EXEC, values, function (err, results) {
    if (callback && typeof callback === "function") {
      callback(err, results);
    } else if (err) {
      return err;
    } else {
      return results;
    }
  });
};

export const createUserMdl = function (userData, callback) {
  const {
    userName,
    firstName,
    lastName,
    email,
    password,
    address,
    mobileNo,
  } = userData;

  const checkEmailQuery = `SELECT COUNT(*) AS emailCount FROM user WHERE email = ?`;
  const checkUsernameQuery = `SELECT COUNT(*) AS usernameCount FROM user WHERE user_name = ?`;

  execQuery(db, checkEmailQuery, [email], function (err, results) {
    if (err) {
      if (callback && typeof callback === "function") {
        callback(err, null);
      } else {
        return err;
      }
    } else {
      const emailCount = results[0].emailCount;

      execQuery(db, checkUsernameQuery, [userName], function (err, results) {
        if (err) {
          if (callback && typeof callback === "function") {
            callback(err, null);
          } else {
            return err;
          }
        } else {
          const usernameCount = results[0].usernameCount;

          if (emailCount > 0) {
            const emailExistsError = new Error("Email already exists");
            if (callback && typeof callback === "function") {
              callback(emailExistsError, null);
            } else {
              return emailExistsError;
            }
          } else if (usernameCount > 0) {
            const usernameExistsError = new Error("Username already exists");
            if (callback && typeof callback === "function") {
              callback(usernameExistsError, null);
            } else {
              return usernameExistsError;
            }
          } else {
            const insertUserQuery = `INSERT INTO user (user_name, first_name, last_name, email, password, mobile_no, address) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const values = [userName, firstName, lastName, email, password, mobileNo, address];

            execQuery(db, insertUserQuery, values, function (err, results) {
              if (callback && typeof callback === "function") {
                callback(err, results);
              } else if (err) {
                return err;
              } else {
                return results;
              }
            });
          }
        }
      });
    }
  });
};

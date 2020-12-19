import csv from "csvtojson";
import NodeRSA from "node-rsa";
import keccak256 from "keccak256";

import userModel from "../../models/user";

import l from "../../common/logger";
import { adminEmail, adminPassword, adminApiKey } from "../../common/config";

class AdminService {
  /**
   * Login for admin
   * @param {string} email - Email of the admin
   * @param {string} password - Password of the admin
   */
  async login(email, password) {
    try {
      if (email !== adminEmail || password !== adminPassword)
        throw { status: 401, message: "Invalid credentials!" };
      return adminApiKey;
    } catch (err) {
      l.error("[ADMIN LOGIN]", err);
      throw err;
    }
  }

  /**
   * Upload student grades
   * @param {string} file - name of the file
   * @param {number} sem - semester number
   */
  async uploadGrades(file, sem) {
    try {
      const grades = await csv().fromFile(
        __dirname + `/../../../public/${file}`
      );

      const users = await userModel.find({ verified: true });
      const pubKeyMap = new Map();
      users.map((user) => {
        pubKeyMap.set(user._id, user.pubKey);
      });

      const updatePromises = [];
      grades.forEach((grade) => {
        const key = new NodeRSA(pubKeyMap.get(grade.roll));
        const encryptedResult = key
          .encrypt(JSON.stringify(grade), "base64")
          .toString();

        const update = {};
        update[`grades.${sem}`] = encryptedResult;
        update[`hashes.${sem}`] = keccak256(JSON.stringify(grade)).toString(
          "hex"
        );

        updatePromises.push(userModel.findByIdAndUpdate(grade.roll, update));
      });

      await Promise.all(updatePromises);
    } catch (err) {
      throw err;
    }
  }
}

export default new AdminService();

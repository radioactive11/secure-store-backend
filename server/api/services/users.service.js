import MailerService from "./mailer.service";

import userModel from "../../models/user";

import l from "../../common/logger";
import generateOtp from "../../utils/otpGenerator";

class UsersService {
  /**
   * Register the student and send a verification OTP
   * @param {string} roll - Roll Number of the student
   */
  async register(roll) {
    try {
      const user = await userModel.findById(roll);
      if (user?.verified) throw { message: "User already registered!" };

      const year = roll.slice(0, 4);
      const batch = roll.slice(4, 7);
      const number = parseInt(roll.slice(8));
      const otp = generateOtp().toString();

      if (user) {
        const mailPromise = MailerService.sendOTP(
          `${batch}_${year}${number}@iiitm.ac.in`,
          otp
        );
        const userPromise = userModel.findByIdAndUpdate(roll, {
          otp,
          otpExpiry: new Date().getTime() + 5 * 60 * 1000,
        });

        await Promise.all([mailPromise, userPromise]);
      } else {
        const mailPromise = MailerService.sendOTP(
          `${batch}_${year}${number}@iiitm.ac.in`,
          otp
        );
        const userPromise = userModel.create({
          _id: roll,
          otp,
          otpExpiry: new Date().getTime() + 5 * 60 * 1000,
        });

        await Promise.all([mailPromise, userPromise]);
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Verify the OTP that was sent to the user on their email
   * @param {string} roll - Roll number of the user
   * @param {string} otp - OTP the user received on their email
   * @param {string} pubKey - Public Key of the user
   */
  async verifyOtp(roll, otp, pubKey) {
    try {
      const user = await userModel.findById(roll);
      if (!user) throw { message: "User not found!" };
      if (user.verified) throw { message: "User has already been verified" };
      if (user.otp != otp) throw { message: "Invalid OTP" };
      if (user.otpExpiry < new Date().getTime())
        throw { message: "OTP expired!" };

      await userModel.findByIdAndUpdate(roll, {
        verified: true,
        pubKey,
      });
    } catch (err) {
      throw err;
    }
  }
}

export default new UsersService();
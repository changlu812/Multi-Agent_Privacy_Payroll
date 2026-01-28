const config = require("../config");

// 导入真实的Kite SDK
const { KiteSDK } = require("gokite-aa-sdk");

class BaseAgent {
  constructor(agentType, privateKey) {
    this.agentType = agentType;
    this.privateKey = privateKey;
    this.kiteSDK = null;
    this.address = null;
    this.init();
  }

  async init() {
    try {
      // 使用真实的Kite SDK
      this.kiteSDK = new KiteSDK({
        rpcUrl: config.kite.rpcUrl,
        apiKey: config.kite.apiKey,
        chainId: config.kite.chainId,
      });

      // 验证Agent身份
      const authResult = await this.kiteSDK.authenticate(this.privateKey);
      console.log(`${this.agentType} Agent authentication result:`, authResult);

      // 获取Agent地址
      this.address = await this.kiteSDK.getAddress(this.privateKey);
      console.log(`${this.agentType} Agent address:`, this.address);

      console.log(`${this.agentType} Agent initialized successfully`);
    } catch (error) {
      console.error(`${this.agentType} Agent initialization failed:`, error);
      // 不抛出错误，允许程序继续运行
    }
  }

  async callKiteMethod(method, params) {
    try {
      return await this.kiteSDK[method](params);
    } catch (error) {
      console.error(`${this.agentType} Agent Kite method call failed:`, error);
      throw error;
    }
  }

  encryptData(data, key) {
    const crypto = require("crypto");
    // 确保密钥长度为32字节（256位）
    const derivedKey = crypto.createHash("sha256").update(key).digest();
    const iv = crypto.randomBytes(config.encryption.ivLength);
    const cipher = crypto.createCipheriv(
      config.encryption.algorithm,
      derivedKey,
      iv,
    );
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return {
      iv: iv.toString("hex"),
      encryptedData: encrypted,
    };
  }

  decryptData(encryptedData, key, iv) {
    const crypto = require("crypto");
    // 确保密钥长度为32字节（256位）
    const derivedKey = crypto.createHash("sha256").update(key).digest();
    const decipher = crypto.createDecipheriv(
      config.encryption.algorithm,
      derivedKey,
      Buffer.from(iv, "hex"),
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // 验证支付意图
  async validatePaymentIntent(paymentIntent) {
    try {
      // 验证支付意图的基本字段
      if (
        !paymentIntent.to ||
        !paymentIntent.amount ||
        !paymentIntent.currency
      ) {
        throw new Error("Invalid payment intent: missing required fields");
      }

      // 验证金额格式
      if (
        typeof paymentIntent.amount !== "string" &&
        typeof paymentIntent.amount !== "number"
      ) {
        throw new Error(
          "Invalid payment intent: amount must be string or number",
        );
      }

      console.log(
        `${this.agentType} Agent validated payment intent:`,
        paymentIntent,
      );
      return true;
    } catch (error) {
      console.error(
        `${this.agentType} Agent failed to validate payment intent:`,
        error,
      );
      throw error;
    }
  }

  // 签名验证
  async verifySignature(message, signature, address) {
    try {
      const result = await this.kiteSDK.verifySignature({
        message,
        signature,
        address,
      });
      console.log(
        `${this.agentType} Agent signature verification result:`,
        result,
      );
      return result;
    } catch (error) {
      console.error(
        `${this.agentType} Agent signature verification failed:`,
        error,
      );
      throw error;
    }
  }

  async getBalance(address) {
    return await this.kiteSDK.getBalance(address);
  }

  async sendPayment(to, amount, currency) {
    // 验证支付意图
    await this.validatePaymentIntent({ to, amount, currency });

    // 发送支付
    return await this.kiteSDK.sendPayment({ to, amount, currency });
  }

  async getAddress() {
    if (!this.address) {
      this.address = await this.kiteSDK.getAddress(this.privateKey);
    }
    return this.address;
  }
}

module.exports = BaseAgent;

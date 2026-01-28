"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AASDKError = void 0;
class AASDKError extends Error {
    constructor(error) {
        super(error.message);
        this.name = 'AASDKError';
        this.type = error.type;
        this.code = error.code;
        this.details = error.details;
    }
}
exports.AASDKError = AASDKError;

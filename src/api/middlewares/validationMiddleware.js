import * as schemas from '../../utils/validations/index.js';
import zodValidate from '../../utils/validations/zodValidator.js';

//User validations
export const validateLogin = zodValidate(schemas.signInSchema);
export const validateRegister = zodValidate(schemas.signUpUserSchema);
export const validateUpdateUser = zodValidate(schemas.updateUserSchema);

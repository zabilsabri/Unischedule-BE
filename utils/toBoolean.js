function toBoolean(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}
  
module.exports = {
  toBoolean
};
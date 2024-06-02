const witaTime = () => {
    const date = new Date();
    const witaOffset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const witaTime = new Date(date.getTime() + witaOffset);

    return witaTime;
}

module.exports = {witaTime}
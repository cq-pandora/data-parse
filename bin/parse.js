const variableWithValue = /^\s*([\w\d<>$_]+) +([\w\d_]+)( += +(.*))/i;
const objectDefinition = /^\s*([\w\d<>$_]+) +([\w\d_]+)/i;
const indentCountRegex = /^(\t*)/i;
const arraySizeRegex = /^\s*.+\s+size += +(\d+)/;
const arrayIndexRegex = /^\s*\[(\d+)\]/;
const stringValueRegex = /^"(.*)"$/;

const indentCount = line => (line.match(indentCountRegex)[0].split('\t').length - 1);
const getArrayIndex = line => parseInt(line.match(arrayIndexRegex)[1]);
 const log = line => {};

function parseArray(lines, lineNumber, currentIndentCount, size) {
    let res = [];

    if (size === 0) {
        return {
            lastLineNumber: lineNumber,
            parsed: res,
        };
    }

    while (true) {
        const arrayIndex = getArrayIndex(lines[lineNumber]);

        const aRes = parseObject(lines, ++lineNumber, currentIndentCount);
        res.push(aRes.parsed);
        lineNumber = aRes.lastLineNumber;

        if (arrayIndex === size - 1)
            break;
    }

    return {
        lastLineNumber: lineNumber,
        parsed: res,
    };
}

function parseObject(lines, lineNumber, currentIndentCount) {
    let res = {};
    let i = 0;

    while (!!lines[lineNumber] && indentCount(lines[lineNumber]) >= currentIndentCount) {
        i++;
        const line = lines[lineNumber];

        if (line.match(arrayIndexRegex)) {
            break;
        }

        const variableRes = line.match(variableWithValue);

        if (variableRes) {
            let value = variableRes[4];

            const isString = value.match(stringValueRegex);

            if (isString)
                value = isString[1];

            res[variableRes[2]] = value;
            ++lineNumber;
            continue;
        }

        const objectRes = line.match(objectDefinition);

        if (objectRes) {
            const name = objectRes[2];
            const type = objectRes[1];

            const aRes = (type === 'Array' ?
                parseArray(lines, lineNumber + 2, currentIndentCount + 1, parseInt(lines[lineNumber + 1].match(arraySizeRegex)[1])) :
                parseObject(lines, lineNumber + 1, currentIndentCount + 1)
            );

            lineNumber = aRes.lastLineNumber;
            res[name] = aRes.parsed;

            continue;
        }

        lineNumber++;
    }

    return {
        lastLineNumber: lineNumber,
        parsed: res,
    };
}

module.exports = input => parseObject(input.split('\n').filter(l => !!l), 0, 0).parsed;
export function parseStdoutLine(line, ts) {
    return [
        {
            kind: "text",
            ts,
            text: line,
        },
    ];
}
//# sourceMappingURL=parse-stdout.js.map
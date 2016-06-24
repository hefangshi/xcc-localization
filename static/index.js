const SERVICE_OFFERINGS_COLS = 10;
const OFFERINGS_TARGET_COLS = 5;

const DISPLAY_LABEL_COL = 2;
const DESCRIPTION_COL = 3;

const DISPLAY_LABEL_TYPE = 'DisplayLabel';
const DESCRIPTION_TYPE = 'Description'

const vm = new Vue({
    el: '#localization',
    data: {
        serviceOfferings: '',
        serviceOfferingsTarget: '',
        offeringsTarget: ''
    },
    computed: {
        serviceOfferingsFormatted() {
            return this.formatCSV(this.serviceOfferings, SERVICE_OFFERINGS_COLS, {
                displayLabel: DISPLAY_LABEL_COL
            }).reduce((acc, data, index) => {
                acc[data.displayLabel] = index;
                return acc;
            }, {});
        },
        serviceOfferingsTargetFormatted() {
            return this.formatCSV(this.serviceOfferingsTarget, SERVICE_OFFERINGS_COLS, {
                displayLabel: DISPLAY_LABEL_COL,
                description: DESCRIPTION_COL
            });
        },
        outputFile() {
            const data = this.formatCSV(this.offeringsTarget, OFFERINGS_TARGET_COLS, {
                'Id': 0,
                'Entity Type': 1,
                'Field Name': 2,
                'Source Value': 3,
                'Translated Value': 4
            });
            data.forEach((line, index) => {
                if (line['Field Name'] === DISPLAY_LABEL_TYPE) {
                    const originIndex = this.serviceOfferingsFormatted[line['Source Value']];
                    if (originIndex === undefined) {
                        return console.error(line['Source Value'], 'missed');
                    }
                    const translated = this.serviceOfferingsTargetFormatted[originIndex];
                    if (!translated) {
                        return console.error(line['Source Value'], 'missed');
                    }
                    line['Translated Value'] = translated.displayLabel;
                    if (!data[index - 1] || data[index - 1]['Field Name'] !== DESCRIPTION_TYPE) {
                        return console.error('wrong');
                    }
                    data[index - 1]['Translated Value'] = this.parseToHTML(translated.description);
                }
            });
            let file;
            const properties = { type: 'plain/text' };
            const outputCSV = data.map((line, index) => {
                if (index === 0) {
                    return line['Id'] + ',' +
                        line['Entity Type'] + ',' +
                        line['Field Name'] + ',' +
                        line['Source Value'] + ',' +
                        line['Translated Value'];
                } else {
                    return line['Id'] + ',' +
                        line['Entity Type'] + ',' +
                        line['Field Name'] + ',"' +
                        line['Source Value'].replace(/"/g, '""') + '","' +
                        line['Translated Value'].replace(/"/g, '""') + '"';
                }
            }).join('\r\n');
            try {
                file = new File(['\ufeff', outputCSV], 'output.csv', properties);
            } catch (e) {
                file = new Blob(['\ufeff', outputCSV], properties);
            }
            return URL.createObjectURL(file);
        }
    },
    methods: {
        parseToHTML(content) {
            content = content.replace(/(https?:\/\/.*?)([\)|$])/img, (m, $1, $2) => {
                return '<a href="' + $1 + '">' + $1 + '</a>' + $2;
            });
            return '<p>' + content.replace(/(\n|\r)/g, '<br>\r\n') + '</p>';
        },
        formatCSV(content, total, kv) {
            let formatted = [];
            let so = content.split('\t');
            let curLine = 0;
            while ((curLine + 1) * total - 1 <= so.length) {
                let lastField = so[(curLine + 1) * total - 1];
                let split = lastField.split('\n');
                so[(curLine + 1) * total - 1] = split[0];
                so.splice((curLine + 1) * total, 0, split[1]);
                formatted.push(Object.keys(kv).reduce((acc, k) => {
                    acc[k] = so[curLine * total + kv[k]];
                    return acc;
                }, {}));
                curLine++;
            }
            return formatted;
        }
    }
});

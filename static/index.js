const LANG_FILE_COLS = 10;
const OFFERING_FILE_COLS = 5;

const DISPLAY_LABEL_COL = 2;
const DESCRIPTION_COL = 3;

const DISPLAY_LABEL_TYPE = 'DisplayLabel';
const DESCRIPTION_TYPE = 'Description';

const OFFERING_COLS = ['Id', 'Entity Type', 'Field Name', 'Source Value', 'Translated Value'];
const OFFERING_COLS_INDEX = OFFERING_COLS.reduce((acc, key, index) => {
    acc[key] = index;
    return acc;
}, {});

const vm = new Vue({
    el: '#localization',
    data: {
        OFFERING_COLS: OFFERING_COLS,
        originalFiles: getLS('originalFiles') || '',
        translatedFiles: getLS('translatedFiles') || '',
        offeringsTarget: getLS('offeringsTarget') || '',
        errors: [],
        warnings: [],
        offeringData: [],
        show: false
    },
    ready: function() {
        this.processOfferingData();
    },
    methods: {
        processOfferingData() {
            setLS('originalFiles', this.originalFiles);
            setLS('translatedFiles', this.translatedFiles);
            setLS('offeringsTarget', this.offeringsTarget);
            this.errors = [];
            this.warnings = [];
            const originalIndexs = this.formatPastedCSV(this.originalFiles, LANG_FILE_COLS, {
                displayLabel: DISPLAY_LABEL_COL
            }).reduce((acc, data, index) => {
                acc[data.displayLabel] = index;
                return acc;
            }, {});
            const translatedData = this.formatPastedCSV(this.translatedFiles, LANG_FILE_COLS, {
                displayLabel: DISPLAY_LABEL_COL,
                description: DESCRIPTION_COL
            });
            const offeringData = this.formatPastedCSV(this.offeringsTarget, OFFERING_FILE_COLS, OFFERING_COLS_INDEX);
            offeringData.forEach((line, index) => {
                if (line['Field Name'] === DISPLAY_LABEL_TYPE) {
                    const labelIndex = originalIndexs[line['Source Value']];
                    if (labelIndex === undefined) {
                        return this.warnings.push('Can not find [' + line['Source Value'] + '] in original file');
                    }
                    const translated = translatedData[labelIndex];
                    if (!translated) {
                        return this.errors.push('Can not find [' + line['Source Value'] + '] in translated file');
                    }
                    line['Translated Value'] = translated.displayLabel;
                    if (!offeringData[index - 1] || offeringData[index - 1]['Field Name'] !== DESCRIPTION_TYPE) {
                        this.errors = [];
                        this.warnings = [];
                        return this.errors.push('Offering file format is wrong, [Description] field should followed with a [DisplayLabel] field');
                    }
                    offeringData[index - 1]['Translated Value'] = this.parseToHTML(translated.description);
                }
            });
            this.offeringData = offeringData;
        },
        dataToCSV(data, cols) {
            return data.map((line, index) => {
                return cols.map(key => {
                    let col = line[key];
                    if (/(,|")/.test(col)) {
                        col = col.replace(/"/g, '""');
                        col = '"' + col + '"';
                    }
                    return col;
                }).join(',');
            }).join('\r\n');
        },
        process() {
            this.showMua();
            this.processOfferingData();
        },
        showMua() {
            this.show = !this.show;
        },
        offeringDataToURL(offeringData) {
            let file;
            const properties = { type: 'plain/text' };
            const outputCSV = this.dataToCSV(offeringData, OFFERING_COLS);
            try {
                file = new File(['\ufeff', outputCSV], 'output.csv', properties);
            } catch (e) {
                file = new Blob(['\ufeff', outputCSV], properties);
            }
            return URL.createObjectURL(file);
        },
        parseToHTML(content) {
            content = content.replace(/(https?:\/\/.*?)([\s|\)|$])/img, (m, $1, $2) => {
                return '<a href="' + $1 + '">' + $1 + '</a>' + $2;
            });
            return '<p>' + content.replace(/(\r\n|\n|\r)/g, '<br>\r\n') + '</p>';
        },
        formatPastedCSV(content, total, kv) {
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

function setLS(key, value) {
    try {
        if (window.localStorage) {
            window.localStorage[key] = value;
        }
    } catch (e) {

    }
};

function getLS(key) {
    try {
        if (window.localStorage) {
            return window.localStorage[key];
        }
    } catch (e) {
        return '';
    }
};

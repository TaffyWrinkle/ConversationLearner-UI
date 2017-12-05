import * as React from 'react';
import { returntypeof } from 'react-redux-typescript';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { State } from '../../types'
import { BlisAppBase, ModelUtils, ExtractResponse, TextVariation, DialogType, EntityType } from 'blis-models'
import * as OF from 'office-ui-fabric-react';
import TextVariationCreator from '../TextVariationCreator';
import ExtractorResponseEditor from '../ExtractorResponseEditor';
import EntityCreatorEditor from './EntityCreatorEditor';
import { DialogMode } from '../../types/const'
import { clearExtractResponses, updateExtractResponse, removeExtractResponse } from '../../actions/teachActions'
import './EntityExtractor.css'

interface ComponentState {
    // Has the user made any changes
    extractionChanged: boolean,
    pendingVariationChange: boolean,
    entityModalOpen: boolean,
    warningOpen: boolean,
    // Handle saves after round change
    savedExtractResponses: ExtractResponse[],
    savedRoundIndex: number
    newTextVariations: TextVariation[]
};

// TODO: Need to re-define TextVariaion / ExtractResponse class defs so we don't need
// to do all the messy conversion back and forth
class EntityExtractor extends React.Component<Props, ComponentState> {
    private doneExtractingButton: any = null;

    constructor(p: any) {
        super(p);
        this.state = {
            extractionChanged: false,
            pendingVariationChange: false,
            entityModalOpen: false,
            warningOpen: false,
            savedExtractResponses: null,
            savedRoundIndex: 0,
            newTextVariations: []
        }
        this.onNewEntity = this.onNewEntity.bind(this);
        this.onClickSubmitExtractions = this.onClickSubmitExtractions.bind(this);
        this.onClickUndoChanges = this.onClickUndoChanges.bind(this);
        this.entityEditorHandleClose = this.entityEditorHandleClose.bind(this);
        this.onRemoveExtractResponse = this.onRemoveExtractResponse.bind(this)
        this.onUpdateExtractResponse = this.onUpdateExtractResponse.bind(this)
        this.focusPrimaryButton = this.focusPrimaryButton.bind(this);
    }
    componentWillMount() {
        this.setState({ newTextVariations: this.props.originalTextVariations })
    }

    componentDidMount() {
        setTimeout(this.focusPrimaryButton, 500);
    }
    focusPrimaryButton(): void {
        if (this.doneExtractingButton) {
            this.doneExtractingButton.focus();
        }
    }
    componentWillReceiveProps(newProps: Props) {
        // If I'm swiching my round or have added/removed text variations
        if (this.props.sessionId !== newProps.sessionId ||
            this.props.roundIndex !== newProps.roundIndex ||
            this.props.originalTextVariations.length !== newProps.originalTextVariations.length) {
            // If I made an unsaved change, show save prompt before switching
            if (this.state.extractionChanged) {
                this.setState({
                    newTextVariations: [...newProps.originalTextVariations],
                    extractionChanged: false,
                    savedExtractResponses: this.allResponses(),
                    savedRoundIndex: this.props.roundIndex
                });
            } else {
                this.setState({
                    newTextVariations: [...newProps.originalTextVariations],
                    extractionChanged: false
                })
            }
            this.props.clearExtractResponses();
        }
    }
    entityEditorHandleClose() {
        this.setState({
            entityModalOpen: false
        })
    }
    onNewEntity() {
        this.setState({
            entityModalOpen: true
        })
    }
    handleCloseWarning() {
        this.setState({
            warningOpen: false
        })
    }
    handleOpenWarning() {
        this.setState({
            warningOpen: true
        })
    }
    /** Returns true is predicted entities match */
    isValid(primaryResponse: ExtractResponse, extractResponse: ExtractResponse): boolean {
        let missing = primaryResponse.predictedEntities.filter(item =>
            !extractResponse.predictedEntities.find(er => item.entityId === er.entityId));

        if (missing.length > 0) {
            return false;
        }
        missing = extractResponse.predictedEntities.filter(item =>
            !primaryResponse.predictedEntities.find(er => item.entityId === er.entityId));
        if (missing.length > 0) {
            return false;
        }
        return true;
    }

    /**
     * Ensure each extract response has the same types of predicted entities
     * E.g. if Primary (response[0]) has name and color declared, all variations (1 through n) must also
     * have name and color declared
     */
    allValid(extractResponses: ExtractResponse[]): boolean {
        return extractResponses.every(extractResponse => (extractResponse === extractResponses[0]) ? true : this.isValid(extractResponses[0], extractResponse))
    }

    // Return merge of extract responses and text variations
    allResponses(): ExtractResponse[] {
        return [...ModelUtils.ToExtractResponses(this.state.newTextVariations), ...this.props.extractResponses];
    }
    onClickUndoChanges() {
        this.props.clearExtractResponses();
        this.setState({
            newTextVariations: [...this.props.originalTextVariations],
            extractionChanged: false,
        });
    }
    onClickSubmitExtractions() {
        this.submitExtractions(this.allResponses(), this.props.roundIndex);
    }
    submitExtractions(allResponses: ExtractResponse[], roundIndex: number) {
        // Clear saved responses
        this.setState({
            savedExtractResponses: null,
            savedRoundIndex: 0,
            extractionChanged: false
        })

        if (!this.allValid(allResponses)) {
            this.handleOpenWarning();
            return;
        }

        const textVariations = allResponses.map<TextVariation>(extractResponse => new TextVariation({
            text: extractResponse.text,
            labelEntities: ModelUtils.ToLabeledEntities(extractResponse.predictedEntities)
        }))

        this.props.onTextVariationsExtracted(allResponses[0], textVariations, roundIndex);

    }
    onAddExtractResponse(): void {
        this.setState({
            extractionChanged: true,
            pendingVariationChange: false
        });
    }
    onChangeTextVariation(text: string): void {
        this.setState({
            pendingVariationChange: (text.length > 0)
        });

    }
    onRemoveExtractResponse(extractResponse: ExtractResponse): void {

        // First look for match in extract reponses
        let foundResponse = this.props.extractResponses.find(e => e.text === extractResponse.text);
        if (foundResponse) {
            this.props.removeExtractResponse(foundResponse);
            this.setState({ extractionChanged: true });
        } else {
            // Otherwise change is in text variation
            let newVariations = this.state.newTextVariations
                .filter((v: TextVariation) => v.text !== extractResponse.text);
            this.setState({
                newTextVariations: newVariations,
                extractionChanged: true
            });
        }
    }
    onUpdateExtractResponse(extractResponse: ExtractResponse): void {

        // First for match in extract reponses
        let foundResponse = this.props.extractResponses.find(e => e.text === extractResponse.text);
        if (foundResponse) {
            this.props.updateExtractResponse(extractResponse);
            this.setState({
                extractionChanged: true
            });
        } else {
            // Replace existing text variation (if any) with new one and maintain ordering
            let index = this.state.newTextVariations.findIndex((v: TextVariation) => v.text === extractResponse.text);
            if (index < 0) {
                // Should never happen, but protect just in case
                return;
            }
            let newVariation = ModelUtils.ToTextVariation(extractResponse);
            let newVariations = [...this.state.newTextVariations];
            newVariations[index] = newVariation;
            this.setState({
                newTextVariations: newVariations,
                extractionChanged: true
            });
        }
    }
    onClickSaveCheckYes() {
        // Submit saved extractions and clear saved responses
        this.submitExtractions(this.state.savedExtractResponses, this.state.savedRoundIndex);
        this.setState({
            savedExtractResponses: null,
            savedRoundIndex: 0
        });
    }
    onClickSaveCheckNo() {
        // Clear saved responses
        this.setState({
            savedExtractResponses: null,
            savedRoundIndex: 0
        });
    }
    render() {
        const allResponses = this.allResponses();
        if (!allResponses[0]) {
            return null;
        }

        // Don't show edit components when in auto TEACH or on score step
        const canEdit = (!this.props.autoTeach && this.props.dialogMode === DialogMode.Extractor)
        const extractResponsesToRender = canEdit ? allResponses : [allResponses[0]]
        const allValid = extractResponsesToRender.every(extractResponse => this.isValid(extractResponsesToRender[0], extractResponse))

        return (
            <div>
                {extractResponsesToRender.map((extractResponse, key) => {
                    let isValid = true;
                    if (extractResponse !== allResponses[0]) {
                        isValid = this.isValid(allResponses[0], extractResponse);
                    }

                    return <ExtractorResponseEditor
                        canEdit={canEdit}
                        key={key}
                        isPrimary={key === 0}
                        isValid={isValid}
                        extractResponse={extractResponse}
                        updateExtractResponse={extractResponse => this.onUpdateExtractResponse(extractResponse)}
                        removeExtractResponse={extractResponse => this.onRemoveExtractResponse(extractResponse)}
                        onNewEntitySelected={() => this.onNewEntity()}
                    />
                })}
                {canEdit && <TextVariationCreator
                    appId={this.props.app.appId}
                    sessionId={this.props.sessionId}
                    extractType={this.props.extractType}
                    roundIndex={this.props.roundIndex}
                    onAddVariation={() => this.onAddExtractResponse()}
                    onTextChanged={text => this.onChangeTextVariation(text)}
                />}
                {canEdit && (
                    (this.props.extractType !== DialogType.TEACH) ?
                    (
                        <div className="blis-buttons-row">
                            <OF.PrimaryButton
                                disabled={!this.state.extractionChanged || !allValid || this.state.pendingVariationChange}
                                onClick={this.onClickSubmitExtractions}
                                ariaDescription={'Sumbit Changes'}
                                text={'Submit Changes'}
                                componentRef={(ref: any) => { this.doneExtractingButton = ref }}
                            />
                            <OF.PrimaryButton
                                disabled={!this.state.extractionChanged}
                                onClick={this.onClickUndoChanges}
                                ariaDescription="Undo Changes"
                                text="Undo"
                            />
                        </div>
                    ) : (
                        <div className="blis-buttons-row">
                            <OF.PrimaryButton
                                disabled={!allValid || this.state.pendingVariationChange}
                                onClick={this.onClickSubmitExtractions}
                                ariaDescription={'Score Actions'}
                                text={'Score Actions'}
                                componentRef={(ref: any) => { this.doneExtractingButton = ref }}
                            />
                        </div>
                    ))}
                <div className="blis-dialog-admin__dialogs">
                    <EntityCreatorEditor
                        app={this.props.app}
                        open={this.state.entityModalOpen}
                        entity={null}
                        handleClose={this.entityEditorHandleClose}
                        handleOpenDeleteModal={() => { }}
                        entityTypeFilter={EntityType.LUIS}
                    />
                    <OF.Dialog
                        hidden={!this.state.warningOpen}
                        dialogContentProps={{
                            type: OF.DialogType.normal,
                            title: 'Text variations must all have same tagged entities.'
                        }}
                        modalProps={{
                            isBlocking: false
                        }}
                    >
                        <OF.DialogFooter>
                            <OF.PrimaryButton onClick={() => this.handleCloseWarning()} text='Ok' />
                        </OF.DialogFooter>
                    </OF.Dialog>
                    <OF.Dialog
                        hidden={this.state.savedExtractResponses === null}
                        isBlocking={true}
                        dialogContentProps={{
                            type: OF.DialogType.normal,
                            title: 'Do you want to save your Entity Detection changes?'
                        }}
                        modalProps={{
                            isBlocking: true
                        }}
                    >
                        <OF.DialogFooter>
                            <OF.PrimaryButton onClick={() => this.onClickSaveCheckYes()} text='Yes' />
                            <OF.DefaultButton onClick={() => this.onClickSaveCheckNo()} text='No' />
                        </OF.DialogFooter>
                    </OF.Dialog>
                </div>
            </div>
        )
    }
}
const mapDispatchToProps = (dispatch: any) => {
    return bindActionCreators({
        updateExtractResponse,
        removeExtractResponse,
        clearExtractResponses
    }, dispatch);
}
const mapStateToProps = (state: State, ownProps: any) => {
    return {
        user: state.user,
        entities: state.entities
    }
}

export interface ReceivedProps {
    app: BlisAppBase,
    extractType: DialogType,
    sessionId: string,
    roundIndex: number,
    autoTeach: boolean
    dialogMode: DialogMode,
    extractResponses: ExtractResponse[],
    originalTextVariations: TextVariation[],
    onTextVariationsExtracted: (extractResponse: ExtractResponse, textVariations: TextVariation[], roundIndex: number) => void,
}

// Props types inferred from mapStateToProps & dispatchToProps
const stateProps = returntypeof(mapStateToProps);
const dispatchProps = returntypeof(mapDispatchToProps);
type Props = typeof stateProps & typeof dispatchProps & ReceivedProps;

export default connect<typeof stateProps, typeof dispatchProps, ReceivedProps>(mapStateToProps, mapDispatchToProps)(EntityExtractor);

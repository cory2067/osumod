import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import "../../utilities.css";
import "./Request.css";
import { post, get, delet } from "../../utilities";
import MapCard from "../modules/MapCard";
import gfm from "remark-gfm";
import { CloseCircleTwoTone } from "@ant-design/icons";
import { Layout, Result, Form, Input, message, Button, Switch, Spin } from "antd";
const { TextArea } = Input;
import { navigate } from "@reach/router";

const { Content } = Layout;

const HELP_URL = "https://github.com/cory2067/osumod/blob/master/README.md#request-tab";

const layout = {
  labelCol: {
    span: 6,
  },
  wrapperCol: {
    span: 18,
  },
};

class Request extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.state = { loading: false, pageReady: false, editingNotes: false, owner: {} };
  }

  async componentDidMount() {
    try {
      const settings = await get("/api/settings", { owner: this.props.owner });
      this.setState({ ...settings.queue, owner: settings.owner, pageReady: true });
      document.title = `${settings.owner.username}'s queue`;
    } catch (e) {
      navigate("/404");
    }
  }

  onFinish = async (form) => {
    const link = form.link;
    const regex = /.*(osu|old)\.ppy\.sh\/(s|beatmapsets)\/([0-9]+).*/g;
    const match = regex.exec(link);
    if (!match || !match[3]) {
      return message.error("Please enter a beatmap link");
    }

    this.setState({ loading: true });
    try {
      const { map, errors } = await post("/api/request", {
        ...form,
        id: match[3],
        targetId: this.state.owner._id,
      });
      this.setState({ map, errors });
      if (map) {
        setTimeout(
          () =>
            this.mapRef.current.scrollIntoView({
              behavior: "smooth",
            }),
          250
        );
      }
    } catch (e) {
      message.error(`An unexpected error has occurred`);
      console.log(e);
    }
    this.setState({ loading: false });
  };

  undo = async () => {
    if (this.state.map) {
      await delet("/api/request", { id: this.state.map._id });
      message.info(`Request cancelled`);
      this.setState({ map: null, errors: null });
    }
  };

  toggleOpen = (open) => {
    this.setState({ open });
    post("/api/open", { open });
  };

  isOwner = () => this.state.owner._id && this.state.owner._id === this.props.user._id;
  canRequest = () => (this.state.open && this.props.user._id) || this.isOwner();
  toggleEditingNotes = () => {
    const editing = this.state.editingNotes;
    if (editing) {
      post("/api/notes", { content: this.state.notes })
        .then(() => message.success("Notes saved"))
        .catch(() => message.error("Error saving notes"));
    }
    this.setState({ editingNotes: !editing });
  };
  handleNoteChange = (event) => {
    this.setState({ notes: event.target.value });
  };

  insertVariables = (content) => {
    if (!content) return content;

    const ALLOWED_VARS = ["maxPending", "cooldown"];
    for (const varName of ALLOWED_VARS) {
      content = content.split(`{${varName}}`).join(`${this.state[varName]}`);
    }

    content = content.split("{open}").join(this.state.open ? "Open" : "Closed");
    return content;
  };

  render() {
    let button = "Request";
    if (!this.state.pageReady) button = "Loading...";
    else if (this.isOwner()) button = "Request";
    else if (!this.state.open) button = "Requests Closed";
    else if (!this.props.user._id) button = "Login to Request";

    return (
      <Content className="u-flex-justifyCenter">
        {!this.state.owner._id ? (
          <div className="Request-loading">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <div>
              {this.isOwner() && (
                <div className="Request-container">
                  <Switch
                    checked={this.state.open}
                    onClick={this.toggleOpen}
                    checkedChildren="Open"
                    unCheckedChildren="Closed"
                  />
                  <Button
                    className="Request-edit-button"
                    shape="round"
                    type="primary"
                    onClick={this.toggleEditingNotes}
                  >
                    {this.state.editingNotes ? "Save Notes" : "Edit Notes"}
                  </Button>
                </div>
              )}
              <div className="Request-container Request-notes">
                {this.state.editingNotes ? (
                  <>
                    <TextArea rows={8} value={this.state.notes} onChange={this.handleNoteChange} />
                    <a href={HELP_URL} target="_blank">
                      Formatting help
                    </a>
                  </>
                ) : (
                  <ReactMarkdown
                    plugins={[gfm]}
                    children={this.insertVariables(this.state.notes)}
                  />
                )}
              </div>
              <div className="Request-container">
                <div className="Request-form">
                  <h1>{this.state.owner.username}'s Request Form</h1>
                  <Form {...layout} name="request" onFinish={this.onFinish}>
                    <Form.Item label="Map Link" name="link">
                      <Input />
                    </Form.Item>

                    <Form.Item label="Comments" name="comment">
                      <TextArea rows={3} />
                    </Form.Item>

                    {this.state.m4m && (
                      <Form.Item label="Can M4M" name="m4m" valuePropName="checked">
                        <Switch checkedChildren="Yes" unCheckedChildren="No" />
                      </Form.Item>
                    )}

                    <Form.Item style={{ float: "right" }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={this.state.loading}
                        disabled={!this.canRequest()}
                      >
                        {button}
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
                {this.state.map && (
                  <div className="Request-mapbox" ref={this.mapRef}>
                    <MapCard {...this.state.map} />
                  </div>
                )}

                {this.state.errors && (
                  <div className="Request-error">
                    {this.state.errors.length === 0 ? (
                      <Result
                        status="success"
                        title="Successfully submitted request!"
                        extra={[
                          <Button
                            type="primary"
                            key="view"
                            onClick={() => navigate(`/${this.props.owner}`)}
                          >
                            View Requests
                          </Button>,
                          <Button key="undo" onClick={this.undo}>
                            Undo
                          </Button>,
                        ]}
                      />
                    ) : (
                      <Result
                        className="Request-error"
                        status="error"
                        title="Failed to submit request"
                      >
                        <div>
                          {this.state.errors.map((error, i) => (
                            <div key={i}>
                              <CloseCircleTwoTone twoToneColor="#eb2f96" /> {error}
                            </div>
                          ))}
                        </div>
                      </Result>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Content>
    );
  }
}

export default Request;

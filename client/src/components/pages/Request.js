import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import "../../utilities.css";
import "./Request.css";
import { post, get, delet } from "../../utilities";
import MapCard from "../modules/MapCard";
import { CloseCircleTwoTone } from "@ant-design/icons";
// data from "../../content/home-en";
import { Layout, Result, Form, Input, message, Button, Switch } from "antd";
import TextArea from "antd/lib/input/TextArea";
import { navigate } from "@reach/router";

const { Content } = Layout;

const layout = {
  labelCol: {
    span: 6,
  },
  wrapperCol: {
    span: 18,
  },
};

const tailLayout = {
  wrapperCol: {
    offset: 20,
    span: 4,
  },
};

class Request extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.state = { loading: false, open: false, pageReady: false };
  }

  async componentDidMount() {
    document.title = "osumod";
    const settings = await get("/api/settings");
    this.setState({ open: settings.open, pageReady: true });
  }

  onFinish = async (form) => {
    const link = form.link;
    const regex = /.*(osu|old)\.ppy\.sh\/(b|s|beatmapsets)\/([0-9]+).*/g;
    const match = regex.exec(link);
    if (!match || !match[3]) {
      return message.error("Please enter a beatmap link");
    }

    this.setState({ loading: true });
    try {
      const { map, errors } = await post("/api/request", { ...form, id: match[3] });
      console.log(map);
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

  canRequest = () => this.state.open && this.props.user._id;

  render() {
    let button = "Request";
    if (!this.state.pageReady) button = "Loading...";
    else if (!this.state.open) button = "Requests Closed";
    else if (!this.props.user._id) button = "Login to Request";

    return (
      <Content className="u-flex-justifyCenter">
        <div className="Request-container">
          <div className="Request-form">
            <h1>Nomination Request</h1>
            <Form {...layout} name="basic" onFinish={this.onFinish}>
              <Form.Item label="Map Link" name="link">
                <Input />
              </Form.Item>

              <Form.Item label="Comments" name="comment">
                <TextArea rows={3} />
              </Form.Item>

              <Form.Item label="Can M4M" name="m4m" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>

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
                    <Button type="primary" key="view" onClick={() => navigate("/")}>
                      View Requests
                    </Button>,
                    <Button key="undo" onClick={this.undo}>
                      Undo
                    </Button>,
                  ]}
                />
              ) : (
                <Result className="Request-error" status="error" title="Failed to submit request">
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
      </Content>
    );
  }
}

export default Request;

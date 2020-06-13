import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import "../../utilities.css";
import "./Request.css";
import { post } from "../../utilities";
import MapCard from "../modules/MapCard";
// data from "../../content/home-en";
import { Layout, Card, Form, Input, message, Button } from "antd";
const { Content } = Layout;

class Request extends Component {
  constructor(props) {
    super(props);
    this.state = { loading: false };
  }

  componentDidMount() {
    document.title = "osumod";
  }

  fail(msg) {
    message.error(msg);
  }

  onFinish = async (form) => {
    const link = form.link;
    const regex = /.*(osu|old)\.ppy\.sh\/(b|s|beatmapsets)\/([0-9]+).*/g;
    const match = regex.exec(link);
    if (!match || !match[3]) {
      return this.fail("Invalid beatmap link");
    }

    this.setState({ loading: true });
    try {
      const map = await post("/api/map", { id: match[3] });
      console.log(map);
      this.setState({ map });
    } catch (e) {
      this.fail(e.msg);
    }
    this.setState({ loading: false });
  };

  render() {
    return (
      <Content className="u-flex-justifyCenter">
        <div className="Request-container">
          <Form layout="inline" name="basic" onFinish={this.onFinish}>
            <Form.Item label="Map Link" name="link">
              <Input className="Request-input" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={this.state.loading}>
                Submit
              </Button>
            </Form.Item>
          </Form>

          {this.state.map && (
            <div className="Request-mapbox">
              <MapCard {...this.state.map} />
            </div>
          )}
        </div>
      </Content>
    );
  }
}

export default Request;

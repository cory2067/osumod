import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import "../../utilities.css";
import "./List.css";

// data from "../../content/home-en";
import { Layout, Button, Modal, Input, Form, Select, Switch } from "antd";
const { TextArea } = Input;
import { navigate } from "@reach/router";
import { get, post } from "../../utilities";
import MapCard from "../modules/MapCard";
const { Content } = Layout;

class List extends Component {
  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.state = { reqs: [], editing: null };
  }

  componentDidMount() {
    get("/api/requests", {
      archived: this.props.archived,
      target: this.props.owner,
    }).then((reqs) => this.setState({ reqs }));

    get("/api/settings", { owner: this.props.owner }).then((settings) => {
      if (!settings) navigate("/404");
      this.setState({ m4m: settings.m4m, modderType: settings.modderType });
    });
  }

  edit = (req) => {
    if (this.props.user.username !== this.props.owner) return;
    this.setState({ editing: req._id });
    // this is jank, todo fix this
    setTimeout(() => this.form.current.setFieldsValue({ feedback: "", ...req }));
  };

  onFinish = async (form) => {
    console.log(form);
    const updated = await post("/api/request-edit", { ...form, id: this.state.editing });
    console.log(updated);
    this.setState({
      editing: null,
      reqs: this.state.reqs.map((req) => (req._id === this.state.editing ? updated : req)),
    });
  };

  isBN = () => this.state.modderType === "probation" || this.state.modderType === "full";

  titleText = () => {
    if (this.state.archived) {
      return "Archives";
    }
    if (this.isBN()) {
      return "Nomination Queue";
    }
    return "Modding Queue";
  };

  render() {
    return (
      <Content className="content">
        {this.state.modderType && (
          <h1 className="List-header">
            {this.props.owner}'s {this.titleText()}
          </h1>
        )}
        <div className="List-container">
          {this.state.reqs.map((req) => (
            <MapCard
              {...req}
              edit={this.edit}
              key={req._id}
              compact={this.props.archived}
              showModType={this.state.m4m && !this.props.archived}
            />
          ))}
        </div>
        <Modal
          title="Manage Request"
          visible={this.state.editing}
          footer={false}
          onCancel={() => this.setState({ editing: null })}
        >
          <Form ref={this.form} onFinish={this.onFinish} name="edit">
            <Form.Item label="Status" name="status">
              <Select>
                <Select.Option value="Pending">Pending</Select.Option>
                <Select.Option value="Rejected">Rejected</Select.Option>
                <Select.Option value="Accepted">Accepted</Select.Option>
                {this.isBN() ? (
                  <>
                    <Select.Option value="Modded">Modded</Select.Option>
                    <Select.Option value="Nominated">Nominated</Select.Option>
                    <Select.Option value="Ranked">Ranked</Select.Option>
                  </>
                ) : (
                  <Select.Option value="Finished">Finished</Select.Option>
                )}
              </Select>
            </Form.Item>
            <Form.Item label="Feedback" name="feedback">
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Archived" name="archived" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    );
  }
}

export default List;
